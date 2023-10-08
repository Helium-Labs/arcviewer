import algosdk from "algosdk";
import axios from "axios";
import * as mfsha2 from "multiformats/hashes/sha2";
import { CID } from "multiformats/cid";
import * as digest from "multiformats/hashes/digest";
import { ARC3_NAME, ARC3_NAME_SUFFIX, ARC3_URL_SUFFIX, IPFSProxyPath, } from "./constants.js";
import { ARCStandard, } from "./types.js";
/**
 * Returns the asset info for the given asset index
 * @param assetIndex
 * @returns AssetInfo for given asset index
 * @throws Error if asset index is not found
 */
export async function getAssetInfo(assetIndex, algoClient) {
    let assetInfo = await algoClient.getAssetByID(assetIndex).do();
    return assetInfo;
}
export function convertPotentialIpfsToHttps(url) {
    if (!url) {
        return undefined;
    }
    if (url.startsWith("ipfs://")) {
        return `${IPFSProxyPath}${url.split("ipfs://")[1]}`;
    }
    else if (url.startsWith("https://")) {
        return url;
    }
    return undefined;
}
// URL points to metadata, and starts with ipfs:// or https://. Assume cross origin is supported.
async function getARC3Metadata(assetInfo) {
    if (!assetInfo.params) {
        throw new Error("Missing params field.");
    }
    const url = assetInfo.params.url;
    const httpsUrl = convertPotentialIpfsToHttps(url);
    // fetch metadata
    const response = await axios.get(httpsUrl);
    let metadata = {};
    let httpsImageUrl = "";
    let httpsAnimationUrl = "";
    if (response.headers["content-type"] === "application/json") {
        // extract the image -- assume it's the image field
        metadata = response.data;
        httpsAnimationUrl = convertPotentialIpfsToHttps(metadata?.animation_url);
        httpsImageUrl = convertPotentialIpfsToHttps(metadata?.image);
    }
    else {
        // assume it's an image
        httpsImageUrl = httpsUrl;
    }
    return { httpsImageUrl, httpsAnimationUrl, metadata };
}
// returns undefined if it's not an arc69 asset (has no metadata)
async function getARC69MetadataJSON(assetId, isMainNet = true) {
    // Fetch `acfg`
    let url = `https://mainnet-idx.algonode.cloud/v2/assets/${assetId}/transactions?tx-type=acfg`;
    if (!isMainNet) {
        url = `https://testnet-idx.algonode.cloud/v2/assets/${assetId}/transactions?tx-type=acfg`;
    }
    let transactions;
    try {
        //transactions = (await axios.get(url).then((res) => res.json())).transactions;
        const response = await axios.get(url);
        transactions = response.data.transactions;
    }
    catch (err) {
        console.error(err);
        return undefined;
    }
    // Sort the most recent `acfg` transactions first.
    transactions.sort((a, b) => b["round-time"] - a["round-time"]);
    // Attempt to parse each `acf` transaction's note for ARC69 metadata.
    for (const transaction of transactions) {
        try {
            const noteBase64 = transaction.note;
            // atob alternative
            const noteString = Buffer.from(noteBase64, "base64").toString("ascii");
            const noteStringFiltered = noteString.trim().replace(/[^ -~]+/g, "");
            const noteObject = JSON.parse(noteStringFiltered);
            if (noteObject.standard === "arc69") {
                return noteObject;
            }
        }
        catch (err) {
            // Oh well... Not valid JSON.
        }
    }
    return undefined;
}
// assume url points directly to metadata, which contains a link to an image
async function getARC19Metadata(assetInfo) {
    if (!assetInfo.params) {
        throw new Error("Missing params field.");
    }
    const url = assetInfo.params.url;
    const reserve = assetInfo.params.reserve;
    if (!url || !reserve) {
        throw new Error("Missing url or reserve field.");
    }
    const metadataUrl = await arcResolveProtocol(url, reserve);
    const response = await axios.get(metadataUrl);
    const metadata = response.data;
    const imageIPFSUrl = metadata.image;
    const httpsImageUrl = convertPotentialIpfsToHttps(imageIPFSUrl);
    const animationIPFSUrl = metadata.animation_url;
    const httpsAnimationUrl = convertPotentialIpfsToHttps(animationIPFSUrl);
    return { httpsImageUrl, httpsAnimationUrl, metadata };
}
/**
 * Extract NFT image from IPFS metadata, with https://ipfs.io/ipfs/ prefix to make it usable without cross-origin issues
 * Understands the different cases that are possible, like ARC3, ARC19, and ARC69. Assumes only an image is present.
 * ARC3 points to JSON with an image link, ARC19 points to JSON with an image link, ARC69 points directly to the image.
 * Also returns the metadata.
 *
 * @param {any} assetInfo
 * @returns {UniversalARCNFTMetadata}
 */
export async function extractNFTMetadata(assetInfo, isMainNet) {
    if (!assetInfo) {
        throw new Error("Missing assetInfo");
    }
    const standards = [];
    if (getIsARC3Asset(assetInfo)) {
        standards.push(ARCStandard.ARC3);
    }
    if (getIsARC19Asset(assetInfo)) {
        standards.push(ARCStandard.ARC19);
    }
    let arc69Metadata = await getARC69MetadataJSON(assetInfo.index, isMainNet);
    if (arc69Metadata) {
        standards.push(ARCStandard.ARC69);
    }
    if (standards.length === 0) {
        // it's a custom standard
        standards.push(ARCStandard.CUSTOM);
    }
    let arc3Metadata = undefined;
    let arc19Metadata = undefined;
    let httpsAnimationUrl = undefined;
    let httpsImageUrl = undefined;
    if (standards.includes(ARCStandard.ARC19)) {
        const arc19Data = await getARC19Metadata(assetInfo);
        httpsAnimationUrl = arc19Data.httpsAnimationUrl;
        httpsImageUrl = arc19Data.httpsImageUrl;
        arc19Metadata = arc19Data.metadata;
    }
    if (standards.includes(ARCStandard.ARC3)) {
        const arc3Data = await getARC3Metadata(assetInfo);
        httpsAnimationUrl = httpsAnimationUrl || arc3Data.httpsAnimationUrl;
        httpsImageUrl = httpsImageUrl || arc3Data.httpsImageUrl;
        arc3Metadata = arc3Data.metadata;
    }
    if (standards.includes(ARCStandard.ARC69)) {
        const url = assetInfo.params.url;
        httpsImageUrl = httpsImageUrl || convertPotentialIpfsToHttps(url);
    }
    let customMetadata;
    if (standards.includes(ARCStandard.CUSTOM)) {
        // go through all methods until we find one that returns an image and metadata
        try {
            const arc19Data = await getARC19Metadata(assetInfo);
            httpsAnimationUrl = arc19Data.httpsAnimationUrl;
            httpsImageUrl = arc19Data.httpsImageUrl;
            customMetadata = arc19Data.metadata;
        }
        catch (err) {
            console.error(err);
        }
        try {
            const arc3Data = await getARC3Metadata(assetInfo);
            httpsAnimationUrl = httpsAnimationUrl || arc3Data.httpsAnimationUrl;
            httpsImageUrl = httpsImageUrl || arc3Data.httpsImageUrl;
            customMetadata = {
                ...customMetadata,
                ...arc3Data.metadata,
            };
        }
        catch (err) {
            console.error(err);
        }
        const url = assetInfo.params.url;
        httpsAnimationUrl = httpsAnimationUrl || convertPotentialIpfsToHttps(url);
    }
    // keep metadata fields separate for each standard in the json response, but have one imageUrl field
    const universalARCMetadata = {
        standards,
        httpsAnimationUrl,
        httpsImageUrl,
        arc3Metadata,
        arc19Metadata,
        arc69Metadata,
        customMetadata,
    };
    // prune undefined fields
    for (const key in universalARCMetadata) {
        if (universalARCMetadata[key] === undefined) {
            delete universalARCMetadata[key];
        }
    }
    const universalARCData = universalARCMetadata;
    return universalARCData;
}
export function arcResolveProtocol(url, reserveAddr) {
    if (url.endsWith(ARC3_URL_SUFFIX))
        url = url.slice(0, url.length - ARC3_URL_SUFFIX.length);
    let chunks = url.split("://");
    // Check if prefix is template-ipfs and if {ipfscid:..} is where CID would normally be
    if (chunks[0] === "template-ipfs" && chunks[1].startsWith("{ipfscid:")) {
        // Look for something like: template:ipfs://{ipfscid:1:raw:reserve:sha2-256} and parse into components
        chunks[0] = "ipfs";
        const cidComponents = chunks[1].split(":");
        if (cidComponents.length !== 5) {
            // give up
            console.log("unknown ipfscid format");
            return url;
        }
        const [, cidVersion, cidCodec, asaField, cidHash] = cidComponents;
        // const cidVersionInt = parseInt(cidVersion) as CIDVersion
        if (cidHash.split("}")[0] !== "sha2-256") {
            console.log("unsupported hash:", cidHash);
            return url;
        }
        if (cidCodec !== "raw" && cidCodec !== "dag-pb") {
            console.log("unsupported codec:", cidCodec);
            return url;
        }
        if (asaField !== "reserve") {
            console.log("unsupported asa field:", asaField);
            return url;
        }
        let cidCodecCode;
        if (cidCodec === "raw") {
            cidCodecCode = 0x55;
        }
        else if (cidCodec === "dag-pb") {
            cidCodecCode = 0x70;
        }
        if (!cidCodecCode) {
            throw new Error("unknown codec");
        }
        // get 32 bytes Uint8Array reserve address - treating it as 32-byte sha2-256 hash
        const addr = algosdk.decodeAddress(reserveAddr);
        const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey);
        const version = parseInt(cidVersion);
        const cid = CID.create(version, cidCodecCode, mhdigest);
        chunks[1] = cid.toString() + "/" + chunks[1].split("/").slice(1).join("/");
    }
    //Switch on the protocol
    switch (chunks[0]) {
        case "ipfs": {
            return IPFSProxyPath + chunks[1];
        }
        case "https": //Its already http, just return it
            return url;
        // TODO: Future options may include arweave or algorand
    }
    return url;
}
export function getIsARC3Asset(assetInfo) {
    if (!assetInfo || !assetInfo.params) {
        return false;
    }
    const assetName = assetInfo.params.name;
    const assetUrl = assetInfo.params.url;
    const isArc3ByName = assetName === ARC3_NAME || assetName.endsWith(ARC3_NAME_SUFFIX);
    const isArc3ByUrl = assetUrl && assetUrl.endsWith(ARC3_URL_SUFFIX);
    return isArc3ByName || isArc3ByUrl;
}
export function getIsARC19Asset(assetInfo) {
    const assetUrl = assetInfo.params.url;
    const followsTemplateIPFSArc19Spec = assetUrl.startsWith("template-ipfs://{ipfscid");
    const containsReserveKeyword = assetUrl.includes("reserve");
    const isARC19 = followsTemplateIPFSArc19Spec && containsReserveKeyword;
    return isARC19;
}
export async function getIsARC69Asset(assetInfo) {
    // no definitive way to identify ARC69 assets except not ARC3 or ARC19, and url starts with ipfs:// or https://
    const assetUrl = assetInfo.params.url;
    const startsWithIPFS = assetUrl.startsWith("ipfs://");
    const startsWithHTTPS = assetUrl.startsWith("https://");
    const isNotARC3 = !getIsARC3Asset(assetInfo);
    const isNotARC19 = !getIsARC19Asset(assetInfo);
    const isARC69 = (startsWithIPFS || startsWithHTTPS) && isNotARC3 && isNotARC19;
    return isARC69;
}

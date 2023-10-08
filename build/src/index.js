import { extractNFTMetadata, getAssetInfo } from "./util";
import axios from "axios";
import { File } from "buffer";
function getImageMimeTypeFromAssetMetadata(metadata) {
    let mimeType = undefined;
    if (metadata.arc3Metadata) {
        mimeType = mimeType || metadata.arc3Metadata.image_mimetype;
    }
    if (metadata.arc19Metadata) {
        mimeType = mimeType || metadata.arc19Metadata.image_mimetype;
    }
    if (metadata.arc69Metadata) {
        mimeType = mimeType || metadata.arc69Metadata.mime_type;
    }
    if (metadata.customMetadata) {
        mimeType = mimeType || metadata.customMetadata.image_mimetype;
    }
    return mimeType || "image/png";
}
function getAnimationMimeTypeFromAssetMetadata(metadata) {
    let mimeType = undefined;
    if (metadata.arc3Metadata) {
        mimeType = mimeType || metadata.arc3Metadata.animation_url_mimetype;
    }
    if (metadata.arc19Metadata) {
        mimeType = mimeType || metadata.arc19Metadata.animation_url_mimetype;
    }
    if (metadata.arc69Metadata) {
        mimeType = mimeType || metadata.arc69Metadata.mime_type;
    }
    if (metadata.customMetadata) {
        mimeType = mimeType || metadata.customMetadata.animation_url_mimetype;
    }
    return mimeType || "image/png";
}
/**
 * Algorand NFT Viewer. Fetches and parses NFT metadata from Algorand blockchain given an asset id.
 * @param {Algodv2} algorandClient Algorand client instance
 * @returns AlgorandUtil instance
 */
export default class AlgorandNFTViewer {
    algoClient;
    /**
     * @param {Algodv2} algorandClient Algorand client instance
     * @returns AlgorandUtil instance
     */
    constructor(algorandClient) {
        this.algoClient = algorandClient;
    }
    /**
     * Get all data for a given asset including the original file for reuploading if necessary, and the metadata
     * @param {number} assetId the asset id of the asset to get data for
     * @returns {NFTAsset} the asset data
     */
    async getAssetMetadata(assetId, isMainNet) {
        const asa = await getAssetInfo(assetId, this.algoClient);
        const params = asa.params;
        const arcMetadata = await extractNFTMetadata(asa, isMainNet);
        const nftAsset = {
            index: assetId,
            arcMetadata,
            params: params,
        };
        return nftAsset;
    }
    async getNFTAssetData(assetId, isMainNet = true) {
        const assetMetadata = await this.getAssetMetadata(assetId, isMainNet);
        return assetMetadata;
    }
    async getNFTAssetDataWithFiles(assetIndex, isMainNet = true) {
        const assetData = await this.getNFTAssetData(assetIndex, isMainNet);
        const isNodeEnvironment = typeof process !== 'undefined' && process.release && process.release.name === 'node';
        const headers = isNodeEnvironment ? undefined : { Origin: window.location.origin };
        const getFileFromUrl = async (url, mimeType, fileName) => {
            return new Promise(async (resolve, reject) => {
                axios
                    .get(url, {
                    responseType: "blob",
                    headers
                })
                    .then((response) => {
                    const metadataFile = new File([response.data], fileName, {
                        type: mimeType,
                    });
                    resolve(metadataFile);
                })
                    .catch((error) => {
                    reject(error);
                });
            });
        };
        const files = [];
        if (assetData.arcMetadata.httpsImageUrl) {
            const mimeType = getImageMimeTypeFromAssetMetadata(assetData.arcMetadata);
            const fileFromUrl = await getFileFromUrl(assetData.arcMetadata.httpsImageUrl, mimeType, "image");
            files.push(fileFromUrl);
        }
        if (assetData.arcMetadata.httpsAnimationUrl) {
            const mimeType = getAnimationMimeTypeFromAssetMetadata(assetData.arcMetadata);
            const fileFromUrl = await getFileFromUrl(assetData.arcMetadata.httpsAnimationUrl, mimeType, "animation");
            files.push(fileFromUrl);
        }
        return {
            files,
            assetData,
        };
    }
    /**
     * Extract all fields as a JSON object from a given asset, returned as Key Value Pairs which can be rendered
     * @param {NFTAsset} NFTAsset the asset to extract fields from
     * @returns {object} the extracted fields
     */
    getMetadataFields(assetData) {
        const keyValuePairs = { ...assetData?.params, id: assetData.index };
        // filter out key-value pairs with keys in ignoreKeys
        const filteredPairs = Object.entries(keyValuePairs);
        // put back into object
        const result = {};
        for (const [key, value] of filteredPairs) {
            result[key] = value;
        }
        // sort the keys by the given array order of keys, and otherwise in alphabetical order
        const sortedResult = {};
        const desiredOrder = [
            "id",
            "creator",
            "manager",
            "reserve",
            "freeze",
            "clawback",
            "unit-name",
            "total",
            "decimals",
        ];
        const sortedKeys = Object.keys(result).sort((a, b) => {
            const aIndex = desiredOrder.indexOf(a);
            const bIndex = desiredOrder.indexOf(b);
            if (aIndex === -1 && bIndex === -1) {
                return a.localeCompare(b);
            }
            if (aIndex === -1) {
                return 1;
            }
            if (bIndex === -1) {
                return -1;
            }
            return aIndex - bIndex;
        });
        for (const key of Object.keys(sortedKeys)) {
            sortedResult[key] = result[key];
        }
        // make the keys capitalized, with splitting at '-'
        const capitalizedResult = {};
        for (const [key, value] of Object.entries(sortedResult)) {
            const capitalizedKey = key
                .split("-")
                .map((e) => e.charAt(0).toUpperCase() + e.slice(1))
                .join(" ");
            capitalizedResult[capitalizedKey] = value;
        }
        return capitalizedResult;
    }
    /**
     * Get property, if it's defined, from NFTAsset. E.g. "description"
     * @param {NFTAsset} NFTAsset the asset to extract fields from
     * @returns {any} the extracted property
     */
    getProperty(assetData, property) {
        if (!assetData?.arcMetadata)
            return null;
        if (!property)
            return null;
        const standards = [
            "arc3Metadata",
            "arc19Metadata",
            "arc69Metadata",
            "customMetadata",
        ];
        // return first instance of metadata in keys
        for (const standard of standards) {
            if (!assetData?.arcMetadata[standard])
                continue;
            if (property in assetData.arcMetadata[standard]) {
                // return undefined instead of empty object
                if (Object.keys(assetData.arcMetadata[standard][property]).length === 0)
                    return undefined;
                return assetData.arcMetadata[standard][property];
            }
        }
        return undefined;
    }
}

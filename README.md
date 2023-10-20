# Arcviewer

Utility for reading ARC3, ARC19, or ARC69 compliant data stored on Algorand.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Features

- Get metadata for ARC3, ARC19 and ARC69 NFT Algorand digital assets
- Get files for ARC3, ARC19 and ARC69 NFT Algorand digital assets
- Comprehensive typescript types

## Installation

Install via npm:

```bash
npm install @gradian/arcviewer
```

## Usage

```javascript
import AlgorandNFTViewer from '@gradian/arcviewer';
// algoClient is an algosdk.AlgodV2 Algorand Client instance
const algorandNFTViewer = new AlgorandNFTViewer(algoClient)

const isMainnet = true
const assetIndex = 123456678

// 'files' is an array (File[]) that contains media representations of the asset, like images or music. 'nftAsset' (of type NFTAsset) holds all the related metadata.
const {nftAsset, files} = algorandNFTViewer.getNFTAssetDataWithFiles(assetIndex, isMainnet)

// Extract key-value pairs of all metadata fields for the given asset
const metadataKVPairs = algorandNFTViewer.getMetadataFields(nftAsset)

// Extract a particular metadata field for the given asset
const description = algorandNFTViewer.getProperty(nftAsset, 'description')
```

## Building

To build the project, run:

```bash
npm run build
```

## ARC3, ARC19, and ARC69 Algorand Request for Comment Standards

- [ARC3 Digital Assets](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0003.md)
- [ARC19 Digital Assets](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0019.md)
- [ARC69 Digital Assets](https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0069.md)

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.


## Disclaimer

**This software is intended for educational purposes, and is not intended to faciliate any illegal activity. You assume all responsibility in using this open source software.**

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

By using this software, you acknowledge and agree that the authors and contributors of this software are not responsible or liable, directly or indirectly, for any damage or loss caused, or alleged to be caused, by or in connection with the use of or reliance on this software. This includes, but is not limited to, any bugs, errors, defects, failures, or omissions in the software or its documentation. Additionally, the authors are not responsible for any security vulnerabilities or potential breaches that may arise from the use of this software.

You are solely responsible for the risks associated with using this software and should take any necessary precautions before utilizing it in any production or critical systems. It's strongly recommended to review the software thoroughly and test its functionalities in a controlled environment before any broader application.

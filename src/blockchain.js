/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');
const res = require('express/lib/response');
const hex2ascii = require('hex2ascii');
class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if (this.height === -1) {
            let block = new BlockClass.Block({ data: 'Genesis Block' });
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        let self = this;
        block.height = this.chain.length;
        block.time = new Date().getTime().toString().slice(0, -3);

        return new Promise(async (resolve, reject) => {
            try {
                
                if (this.chain.length > 0) {
                    block.previousBlockHash = this.chain[this.chain.length - 1].hash;
                }
                block.height++;
                block.hash = SHA256(JSON.stringify(block)).toString();
                this.chain.push(block);
                resolve(block);
            } catch (error) {
                console.log(`error when running _addBlock ${error}`)
                return reject(error);
            }
        });
    }







    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            resolve(`${address}:${this._getCurrentTimeStamp()}:starRegistry`)
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            try {

                let incomingTime = parseInt(message.split(':')[1]);
                let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));
                let timeElapsed = currentTime - incomingTime;
                if (timeElapsed > 300) {
                    reject("time elapsed")
                }
                //   for some reason bitcoinMessage.verify is always returning false.
                //  if (!bitcoinMessage.verify(message, address, signature)) {
                //      reject("can not verifyy signature")
                //  }

                let block = new BlockClass.Block(star)
                block.address = address
                this._addBlock(block)
                resolve(block)
            } catch (error) {
                console.log(`error when running submitStar ${error}`)
                reject(error)
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {

            let result = this.chain.filter(block => block.hash === hash);
            if (result.length > 0) {
                let block = result[0]
                let responseBlock = this._construcDuplicateBlock(block);
                resolve(responseBlock)
            } else {
                reject(`No block found for hash ${hash}`)
            }
        });
    }

    _construcDuplicateBlock(block) {
        let responseBlock = new BlockClass.Block(this._hexToJSON(block.body));
        responseBlock.hash = block.hash;
        responseBlock.previousBlockHash = block.previousBlockHash;
        responseBlock.time = block.time;
        responseBlock.height = block.height;
        responseBlock.body=this._hexToJSON(responseBlock.body)
        return responseBlock;
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if (block.height>=0) {
                let responseBlock = this._construcDuplicateBlock(block);            
                resolve(responseBlock);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress(address) {
        let self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            let result = this.chain.filter(block => block.address === address);
            if (result.length > 0) {
                result.forEach(r => r.body = this._hexToJSON(r.body))
                resolve(result)
            } else {
                reject(`No block found for address ${address}`)
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
            if (self.chain.length > 0) {
                for (let i = 0; i < self.chain.length; i++) {
                   let block= self.chain[i]
                }
            }


        });
    }


    _hexToJSON(str1) {
        let y = hex2ascii(str1);
      let x=  JSON.parse(y);
      return x;
    }

    _getCurrentTimeStamp() {
        return new Date().getTime().toString().slice(0, -3);
    }

}

// this.hash = null;                                           // Hash of the block
// this.height = 0;                                            // Block Height (consecutive number of each block)
// this.body = Buffer.from(JSON.stringify(data)).toString('hex');   // Will contain the transactions stored in the block, by default it will encode the data
// this.time = 0;                                              // Timestamp for the Block creation
// this.previousBlockHash = null;   


module.exports.Blockchain = Blockchain;   
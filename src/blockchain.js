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
const { response } = require('express');
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
            block.height==0
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
        block.height = self.chain.length;
        block.time = this._getCurrentTimeStamp();
        try {
            return new Promise(async (resolve, reject) => {
                if (self.chain.length > 0) {
                    block.previousBlockHash = self.chain[self.chain.length - 1].hash;
                }
                block.hash = SHA256(JSON.stringify(block)).toString();
                self.chain.push(block);
                resolve(block);
            });
        } catch (error) {
            console.log(`error when running _addBlock ${error}`)
            return reject(error);
        }
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
        let validElapsedTime=3000000;
        try {
        return new Promise(async (resolve, reject) => {
           
                this.validateChain().then(errors => {
                    if (errors.length > 0) {
                        return reject(errors);
                    } else {
                        return resolve(block);
                    }
                });

                let incomingTime = parseInt(message.split(':')[1]);
                let currentTime = parseInt(this._getCurrentTimeStamp());
                if (currentTime - incomingTime > validElapsedTime) {
                    reject("time elapsed. Please generated a new message and a new signature")
                }
                if (!bitcoinMessage.verify(message, address, signature)) {
                    reject("can not verify signature")
                }

                let block = new BlockClass.Block(star)
                block.address = address
                this._addBlock(block)
                resolve(block)            
        });
    } catch (error) {
        console.log(`error when running submitStar ${error}`)
        reject(error)
    }
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
                let responseBlock = { ...block };
                responseBlock.star = this._hexToJSON(responseBlock.body)
                responseBlock.owner = responseBlock.address
                delete responseBlock.body
                delete responseBlock.address
                delete responseBlock.hash
                delete responseBlock.height
                delete responseBlock.time
                delete responseBlock.previousBlockHash
                resolve(responseBlock)
            } else {
                reject(`No block found for hash ${hash}`)
            }
        });
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
            if (block ) {
                let obj = { ...block };
                resolve(obj);
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
            let response = [... this.chain.filter(block => block.address === address)]
            if (response && response.length > 0) {
                response.forEach(r => {
                    let s = r.body
                    r.owner = r.address
                    r.star = this._hexToJSON(s)
                    delete r.body
                    delete r.address
                    delete r.hash
                    delete r.height
                    delete r.time
                    delete r.previousBlockHash
                })
                resolve(response)
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
        let chain = this.chain;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
                try{
                    for (let i = 1; i < chain.length; i++) {
                    let currentBlock = chain[i];
                    let currentBlockMessage =   currentBlock.validate()
                    currentBlockMessage.then((message) => {
                        if (!message) {
                            errorLog.push(`At index ${i} Block is not valid`)
                        }
                        let previousBlock = chain[i - 1]
                        let previousuBlockMessage =  previousBlock.validate()
                        previousuBlockMessage.then((message) => {
                            if (!message) {
                                errorLog.push(`At index ${previousBlock} Block is not valid`)
                            }
                        })
                    })
                }
                return resolve(errorLog);
                }
                catch (error) {
                    console.log(`error when running submitStar ${error}`)
                    reject(error)
                }             
        });
    }

    _hexToJSON(hexStr) {
        return JSON.parse(hex2ascii(hexStr));
    }

    _getCurrentTimeStamp() {
        return new Date().getTime().toString().slice(0, -3);
    }

}

module.exports.Blockchain = Blockchain;   
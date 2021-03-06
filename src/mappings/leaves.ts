import { Address, BigInt, BigDecimal, Bytes, json } from "@graphprotocol/graph-ts";

import {
    LostWorld,
    Token,
    TokenTransaction,
    Variation,
} from "../types/schema"

import {
    CurvedRandomLostWorld as CurvedRandomLostWorldContract,
    Transfer as TransferEvent,
} from "../types/templates/LostWorld/CurvedRandomLostWorld"

export function handleTransfer (event: TransferEvent): void {
    // TODO #1: fix token deletion
    if (event.address.toHexString() == "0x695f4015d80d6e1ceae875373fed8573483525bb") {
        return;
    }

    let id = event.address.toHexString().toLowerCase() + "-" + event.params.tokenId.toString();
    let token = Token.load(id);
    if (!token) {    
        token = new Token(id);

        token.tokenID = event.params.tokenId;
        token.lostWorld = event.address.toHexString();
        token.minter = event.params.to;
        token.createdTimestamp = event.block.timestamp.toI32();
        token.hasActiveOrder = false;

        let contract = CurvedRandomLostWorldContract.bind(event.address);  
        let tokenURIString = contract.tokenURI(event.params.tokenId).slice(22);
        let tokenURIBytes = Bytes.fromUTF8(tokenURIString) as Bytes;
        let tokenURI = json.fromBytes(tokenURIBytes).toObject();
    
        let name = tokenURI.get("name");
        if (name) {
            token.name = name.toString();
        }
        let minterLat = tokenURI.get("minterLat");
        if (minterLat) {
            token.minterLat = BigDecimal.fromString(minterLat.toF64().toString());
        }
        let minterLong = tokenURI.get("minterLat");
        if (minterLong) {
            token.minterLat = BigDecimal.fromString(minterLong.toF64().toString());
        }
        let image = tokenURI.get("image");
        if (image) {
            token.image = image.toString();
        }
        let imageLink = tokenURI.get("imageLink");
        if (imageLink) {
            token.imageIPFS = imageLink.toString();
        }
    }

    token.owner = event.params.to;
    token.updatedTimestamp = event.block.timestamp.toI32();
    token.variation = event.address.toHexString() + "-" + token.name;

    token.save();

    // add transaction
    let tokenTransaction = new TokenTransaction(event.transaction.hash.toHexString());
    tokenTransaction.from = event.params.from;
    tokenTransaction.to = event.params.to;
    tokenTransaction.token = id;
    tokenTransaction.timestamp = event.block.timestamp.toI32();
    tokenTransaction.save();

    // increment lostWorlds totalSupply
    let lostWorld = LostWorld.load(event.address.toHexString());
    let variation = Variation.load(token.variation);
    if (lostWorld && variation && event.params.from == Address.zero()) {
        variation.totalSupply = variation.totalSupply.plus(BigInt.fromI32(1));
        variation.save();

        lostWorld.totalSupply = lostWorld.totalSupply.plus(BigInt.fromI32(1));
        lostWorld.save();
    }
}

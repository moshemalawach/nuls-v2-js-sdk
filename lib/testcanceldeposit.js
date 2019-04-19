'use strict';

var nuls = require('./index');
var utils = require('./utils/utils');
var sdk = require("./api/sdk");
var txs = require("./model/txs");

var pri = '94d344417d6faa55e3017709dd6b837bac2bc1769e3a4b516ac9a981465ac03c';
var pub = '02403cb49ac24ff9555b073ce981e28bed5e81438b2c715a14d06bd248ea1d0091';
var fromAddress = "tNULSeBaMfwpGBmn8xuKABPWUbdtsM2cMoinnn";

var amount = 20000100000000;
var remark = 'niels test alias....';

//转账功能 trustUrl
async function doit(pri, pub, fromAddress, assetsChainId, assetsId, amount, depositHash) {

    var balanceInfo = await nuls.getNulsBalance(fromAddress);
    var inputs = [];
    var fee = 100000;

    if (balanceInfo.balance < amount + fee) {
        return { success: false, data: "Your balance is not enough." };
    }

    inputs.push({
        address: fromAddress,
        assetsChainId: assetsChainId,
        assetsId: assetsId,
        amount: amount,
        locked: -1,
        nonce: depositHash.substring(depositHash.length - 16) //这里是hash的最后16个字符
    });

    var outputs = [{
        address: fromAddress, assetsChainId: assetsChainId,
        assetsId: assetsId, amount: amount - fee, lockTime: 0
    }];

    var tt = new txs.WithdrawTransaction(depositHash);
    tt.time = 123456789;
    tt.setCoinData(inputs, outputs);
    tt.remark = remark;
    sdk.signatureTx(tt, pri, pub);
    var txhex = tt.txSerialize().toString('hex');
    nuls.broadcastTx(txhex);
    console.log(txhex);
    return 'done!';
}

//测试开始
doit(pri, pub, fromAddress, 2, 1, amount, 'b355ec688bf17cf086b450f7d5c90298c5f3f5b3a2c49752a629f1f2f5f2b3b7').then(function (response) {
    console.log(response);
}).catch(function (error) {
    console.log(error);
});
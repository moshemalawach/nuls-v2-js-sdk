'use strict';

var nuls = require('../index');
var txs = require('../model/txs');
var Serializers = require("../api/serializers");

var _require = require('./api/util'),
    isMainNet = _require.isMainNet,
    countCtxFee = _require.countCtxFee,
    getBalance = _require.getBalance,
    ctxInputsOrOutputs = _require.ctxInputsOrOutputs,
    validateTx = _require.validateTx,
    broadcastTx = _require.broadcastTx;

var pri = '9ce21dad67e0f0af2599b41b515a7f7018059418bab892a7b68f283d489abc4b'; //tNULSeBaMvEtDfvZuukDf2mVyfGo3DdiN8KLRG
var pub = '03958b790c331954ed367d37bac901de5c2f06ac8368b37d7bd6cd5ae143c1d7e3';
/*
let pri = "4eb6def1dc21f3afbc4d3d0892713e6467a91426940d6f00140629d9d64ba908";//8CPcA7kaj56TWAC3Cix64aYCU3XFoNpu1LN1K
*/
/*let fromAddress = "tNULSeBaMvEtDfvZuukDf2mVyfGo3DdiN8KLRG";
let toAddress = '8CPcA7kaXSHbWb3GHP7bd5hRLFu8RZv57rY9w';*/
var fromAddress = "8CPcA7kaj56TWAC3Cix64aYCU3XFoNpu1LN1K";
var toAddress = 'tNULSeBaMvEtDfvZuukDf2mVyfGo3DdiN8KLRG';
var amount = 2000000;
var remark = '首先你得有一个需要配置自动更新功能的 electron 项目。这里我为了测试自动更新功能里我为了测试自动更新功能是否成功搭建使用的是里我为了测试自动更新功能是否成功搭建使用的是里我为了测试自动更新功能是否成功搭建使用的是里我为了测试自动更新功能是否成功搭建使用的是是否成功搭建使用的是 electron-vue 脚手架搭建的项目首先你得有一个需要配置自动更新功能的 electron 项目。这里我为了测试自动更新功能是否成功搭建使用的是 electron-vue 脚手架搭建的项目首先你得有一个需要配置自动更新功能的 electron 项目。这里我为了测试自动更新功能是否成功搭建使用的是 electron-vue 脚手架搭建的项目首先你得有一个需要配置自动更新功能的  electro';

/**
 * 转账交易
 * @param pri
 * @param pub
 * @param fromAddress
 * @param toAddress
 * @param chainId
 * @param assetsChainId
 * @param assetsId
 * @param amount
 * @param remark
 * @returns {Promise<void>}
 */
async function transferTransaction(pri, pub, fromAddress, toAddress, chainId, assetsChainId, assetsId, amount, remark) {
  //账户转出资产余额
  var balanceInfo = await getBalance(fromAddress, chainId, assetsChainId, assetsId);
  var transferInfo = {
    fromAddress: fromAddress,
    toAddress: toAddress,
    assetsChainId: assetsChainId,
    assetsId: assetsId,
    amount: amount,
    fee: 1000000
  };

  var inOrOutputs = await ctxInputsOrOutputs(transferInfo, balanceInfo);
  var tAssemble = []; //交易组装
  var ctxSign = ""; //本链协议交易签名
  var mainCtxSign = ""; //主网协议交易签名
  var bw = new Serializers();
  var mainCtx = new txs.CrossChainTransaction();
  var pubHex = Buffer.from(pub, 'hex');
  var mainNetBalanceInfo = await getBalance(fromAddress, chainId, 2, 1);

  if (inOrOutputs.success) {
    tAssemble = await nuls.transactionAssemble(inOrOutputs.data.inputs, inOrOutputs.data.outputs, remark, 10);
    var newFee = 0;
    //获取手续费
    if (isMainNet()) {
      newFee = countCtxFee(tAssemble, 1);
    } else {
      newFee = countCtxFee(tAssemble, 2);
      if (mainNetBalanceInfo.balance < newFee) {
        console.log("Your balance is not enough.");
        return;
      }
      mainCtx.time = tAssemble.time;
      mainCtx.remark = tAssemble.remark;
      var mainNetInputs = [{
        address: transferInfo.fromAddress,
        assetsChainId: transferInfo.assetsChainId,
        assetsId: transferInfo.assetsId,
        amount: transferInfo.amount,
        locked: 0,
        nonce: balanceInfo.nonce
      }, {
        address: transferInfo.fromAddress,
        assetsChainId: 2,
        assetsId: 1,
        amount: newFee,
        locked: 0,
        nonce: mainNetBalanceInfo.nonce
      }];
      var mainNetOutputs = [{
        address: transferInfo.toAddress ? transferInfo.toAddress : transferInfo.fromAddress,
        assetsChainId: transferInfo.assetsChainId,
        assetsId: transferInfo.assetsId,
        amount: transferInfo.amount,
        lockTime: 0
      }];
      mainCtx.setCoinData(mainNetInputs, mainNetOutputs);
    }
    //如果手续费发生改变，重新组装CoinData
    if (transferInfo.fee !== newFee) {
      transferInfo.fee = newFee;
      inOrOutputs = await ctxInputsOrOutputs(transferInfo, balanceInfo);
      if (!inOrOutputs.success) {
        console.log(inOrOutputs.data);
        return;
      }
      if (!isMainNet()) {
        inOrOutputs.data.inputs.push({
          address: transferInfo.fromAddress,
          assetsChainId: 2,
          assetsId: 1,
          amount: newFee,
          locked: 0,
          nonce: mainNetBalanceInfo.nonce
        });
      }
      tAssemble = await nuls.transactionAssemble(inOrOutputs.data.inputs, inOrOutputs.data.outputs, remark, 10);
      ctxSign = nuls.transactionSignature(pri, tAssemble);
    } else {
      ctxSign = nuls.transactionSignature(pri, tAssemble);
    }
    bw.writeBytesWithLength(pubHex);
    bw.writeBytesWithLength(ctxSign);
  } else {
    console.log("交易组装失败！");
    console.log(inOrOutputs.data);
    return;
  }
  if (!isMainNet()) {
    mainCtx.txData = tAssemble.getHash();
    mainCtxSign = nuls.transactionSignature(pri, mainCtx);
    bw.writeBytesWithLength(pubHex);
    bw.writeBytesWithLength(mainCtxSign);
  }
  tAssemble.signatures = bw.getBufWriter().toBuffer();
  var txHex = tAssemble.txSerialize().toString('hex');
  var result = await validateTx(txHex);
  if (result.success) {
    console.log(result.data.value);
    var results = await broadcastTx(txHex);
    if (results && results.value) {
      console.log("交易完成");
    } else {
      console.log("广播交易失败");
    }
  } else {
    console.log("验证交易失败:" + result.error);
  }
}

//调用
transferTransaction(pri, pub, fromAddress, toAddress, 100, 100, 1, amount, remark);
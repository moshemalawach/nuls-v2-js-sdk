const nuls = require('../index');
let passWord = '123456asd';//密码为空 私钥会返回
const newAddress = nuls.newAddress(2, passWord);
console.log(newAddress);
let result = nuls.verifyAddress(newAddress.address);
console.log(result);

//根据公钥获取地址
let  address = nuls.getAddressByPub(2,1,'0298f88c3cae67385ce3cbee00f78816db3e56e566b62bd0f4c5b45f205d3021c3');
console.log(address);

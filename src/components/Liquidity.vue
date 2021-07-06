<template>
<div>
    <h2>Liquidity</h2>
    <select v-model="from" @change="selectToken1">
        <option v-for="token in listToken" :value="token.address">
            {{ token.name }}
        </option>
    </select>
    {{fromBalance}}
    <select v-model="to" @change="selectToken2">
        <option v-for="token in listToken" :value="token.address">
            {{ token.name}}
        </option>
    </select>
    {{toBalance}}

    <button v-show="aproveTokenAVisible" @click="aproveToken1">Approved tokenA</button>
    <button v-show="aproveTokenBVisible" @click="aproveToken2">Approved tokenB</button>

    <div>
        <h3>设置</h3>
        <label for="">
            滑点
            <input type="text" v-model="value1"> %
        </label>
        <label for="">
            <input type="text" v-model="minutes"> 时限（分钟）
        </label>
    </div>

    <br>
    <div>
        <h3>数量</h3>
        <input type="text" v-model="inputammout1" @change="changeInputStatus">
        <input type="text" v-model="inputammout2" @change="changeInputStatus2">
        <button @click="supplyToken">Add</button>
    </div>

</div>
</template>

<script>
import Web3 from "web3";
import { ethers } from "ethers";
import DEFAULT_TOKEN_LIST from "../store/rinkebyToken.json";
import tokenAbi from "../contracts/token.json";
import routerAbi from "../contracts/router.json";
import factoryAbi from "../contracts/factory.json";
import pairAbi from "../contracts/pair.json";
import seaTokenAbi from "../contracts/token.json";
import BigNumber from "bignumber.js";
import Store from "../store/index.js";
//设置 默认的小数点
const DEFAULT_DECIMALS = 3;

export default {
  name: "home",
  data() {
    return {
      //TODO WETH 跳转时间
      WETH: "0x7b997DE373d2CDaC72411448D5fa67c5B10Ae816",
       //列表代币
      listToken: DEFAULT_TOKEN_LIST,
      //用户选择地址
      from : null,
      //用户 token A balance
      fromBalance : 0,
      //用户选择地址
      to : null,
      // 用户 token B balance
      toBalance : 0,
      //用于记录 from 信息
      fromTokenInfo: null,
      //用于记录 to 信息
      toTokenInfo: null,
      //用户输入 token A数量
      inputammout1: "",
      //用户输入 tokenB 数量
      inputammout2: "",
      //滑点
      value1: 30,
      //允许时间范围
      minutes: 20,
      //是否显示 tokenA 批准
      aproveTokenAVisible: false,
      //是否显示 tokenB 批准
      aproveTokenBVisible: false,
      web3Provider: "",
    };
  },

  methods: {
    //获取 token 信息
    async getTokenInfo(tokenAddress) {
      const token = this.getTokenObj(tokenAddress);
      let info = {
        name: null,
        symbol: null,
        decimals: null,
        totalSupply: null
      };
      //进行余额查询
      info.name = await token.methods
        .name()
        .call()
        .then();
      info.symbol = await token.methods
        .symbol()
        .call()
        .then();
      info.decimals = await token.methods
        .decimals()
        .call()
        .then();
      info.totalSupply = await token.methods
        .totalSupply()
        .call()
        .then();

      return info;
    },
    //选择代币-tokenA/tokenB
    async selectToken1() {
      //判断 token A 是不是 等于 TokenB
      if (this.from == this.to) {
        this.from = null;
        return;
      }

      const account = ethereum.selectedAddress;

      //判断输入是不是 WBNB
      if (this.from == this.WETH) {
        //查询 ETH 的余额
        this.fromTokenInfo = this.getWBNBObj();
        let balance = await this.web3js.eth.getBalance(account)
        this.fromBalance =  new BigNumber(ethers.utils.formatEther(balance)).toFixed(DEFAULT_DECIMALS);
      } else {
        //实例化 token 合约
        let nameToken = this.getTokenObj(this.from)
        //查询当前 token 信息
        const tokenInfo = await this.getTokenInfo(this.from);
        this.fromTokenInfo = tokenInfo;
        //查询当前 用户 token 余额
        let currentBalance = await nameToken.methods.balanceOf(account).call().then();
        //进行数字的格式修改
        this.fromBalance = new BigNumber(currentBalance).dividedBy(10 ** tokenInfo.decimals).toFixed(DEFAULT_DECIMALS);

        //查询是否需要批准
        const approveLimit = this.getApproveLimit(account, Store.contracts.router.address, this.from);
        if (approveLimit == 0) {
          //显示批准
          this.aproveTokenAVisible = true;
        }
      }
    },

    async selectToken2(e) {
      //判断 token A 是不是 等于 TokenB
      if (this.from == this.to) {
        this.to = null;
        return;
      }
      
      const account = ethereum.selectedAddress;

      //判断输入是不是 WBNB
      if (this.to == this.WETH) {
        //查询 ETH 的余额
        this.toTokenInfo = this.getWBNBObj();
        let balance = await this.web3js.eth.getBalance(account)
        this.toBalance =  new BigNumber(ethers.utils.formatEther(balance)).toFixed(DEFAULT_DECIMALS);
      } else {
        //实例化 token 合约
        let nameToken = this.getTokenObj(this.to)
        //查询当前 token 信息
        const tokenInfo = await this.getTokenInfo(this.to);
        this.toTokenInfo = tokenInfo;
        //查询当前 用户 token 余额
        let currentBalance = await nameToken.methods.balanceOf(account).call().then();
        //进行数字的格式修改
        this.toBalance = new BigNumber(currentBalance).dividedBy(10 ** tokenInfo.decimals).toFixed(DEFAULT_DECIMALS);

        //查询是否需要批准
        const approveLimit = this.getApproveLimit(account, Store.contracts.router.address, this.to);
        if (approveLimit == 0) {
          //显示批准
          this.aproveTokenBVisible = true;
        }
      }
    },

    //获取 token 额度
    async getApproveLimit(owner, spender, tokenAddress) {
      let token = this.getTokenObj(tokenAddress);
      let approveLimit = await token.methods
        .allowance(owner, spender)
        .call()
        .then();
      return approveLimit;
    },
    getWBNBObj()
    {
      let info = {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18,
        totalSupply: "10000000000000000000000"
      };
      return info;
    },

    // MAX值
    maxBa1() {
      this.inputammout1 = this.fromBalance;
    },

    maxBa2() {
      this.inputammout2 = this.toBalance;
    },

    //创建 token 对象---待封装
    getTokenObj(address) {
      return new this.web3js.eth.Contract(tokenAbi, address);
    },

    //创建web3
    async createWeb3Js() {
      var Web3 = require("web3");
      if (ethereum) {
        this.web3Provider = ethereum;
        // 新版需要请求用户授权
        try {
          ethereum.enable();
        } catch (error) {
          alert("用户取消授权");
          return;
        }
      } else if (web3) {
        // MetaMask Legacy dapp browsers...
        this.web3Provider = web3.currentProvider;
        console.log("web3.currentProvider:");
        console.log(web3.currentProvider);
      } else {
        this.web3Provider = new Web3.providers.HttpProvider(
          "https://data-seed-prebsc-1-s1.binance.org:8545"
        );
      }
      this.web3js = new Web3(this.web3Provider);
    },

    //用户输入 tokenA 数量事件
    changeInputStatus() {
      //this.buttonStatus();
      
    },
    //用户输入 tokenB 数量事件
    changeInputStatus2() {
      //this.buttonStatus();
    },

    // 批准 token A
    aproveToken1() {
      const account = ethereum.selectedAddress;
      const tokenObj = this.getTokenObj(this.from);
      let that = this;
      tokenObj.methods.approve(
          Store.contracts.router.address,
          new BigNumber("1.157e+59").toFixed()
        )
        .send({ from: account})
        .then(function(receipt) {
          //隐藏
          that.aproveTokenAVisible = false;
        });
    },

    // 批准 token B
    aproveToken2() {
      const account = ethereum.selectedAddress;
      const tokenObj = this.getTokenObj(this.to);
      let that = this;
      tokenObj.methods.approve(
          Store.contracts.router.address,
          new BigNumber("1.157e+59").toFixed()
        )
        .send({ from: account})
        .then(function(receipt) {
          //隐藏
          that.aproveTokenBVisible = false;
        });
    },

    // 供应-添加流动性(路由地址)
    supplyToken() {
      //判断
      if (this.from == this.WETH) {
        this.addLiquidityETH(this.to, this.inputammout2, this.inputammout1, this.toTokenInfo.decimals);
      } else if(this.to == this.WETH){
        this.addLiquidityETH(this.from, this.inputammout1, this.inputammout2, this.fromTokenInfo.decimals);
      } else {
        this.addLiquidity();
      }

    },

    //双 token 增加流动
    addLiquidity(){
      //获取路由实例
      const router = this.getRouterObj();
      const account = ethereum.selectedAddress;

      //计算参数
      let tokenABig = new BigNumber(this.inputammout1);
      let tokenBBig = new BigNumber(this.inputammout2);
      let amountADesired = tokenABig.multipliedBy(10 ** this.fromTokenInfo.decimals).toFixed();
      let amountBDesired = tokenBBig.multipliedBy(10 ** this.toTokenInfo.decimals).toFixed();
      let amountAMin = new BigNumber(amountADesired)
        .multipliedBy((100 - this.value1) / 100).toFixed();
      let amountBMin = new BigNumber(amountBDesired)
        .multipliedBy((100 - this.value1) / 100).toFixed();
      let nowTimeStamp = parseInt(new Date().getTime() / 1000);
      let deadline = nowTimeStamp + this.minutes * 60;

      let that = this;

      //请求区块
      router.methods
        .addLiquidity(
          this.from,
          this.to,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          account,
          deadline,
        )
        .send({ from: account })
        .then(function(receipt) {
          // 清空
          that.inputammout1 = "";
          that.inputammout2 = "";
        });
    },

    //token/ETH 增加流动
    addLiquidityETH(tokenAddress, tokenNumber, ethNumber, tokenDecimals)
    {
      //获取路由实例
      const router = this.getRouterObj();
      const account = ethereum.selectedAddress;

      //计算参数
      let tokenBig = new BigNumber(tokenNumber);
      let ethBig = new BigNumber(ethNumber);
      let tokenDesired = tokenBig.multipliedBy(10 ** tokenDecimals).toFixed();
      let ethDesired = ethBig.multipliedBy(10 ** 18).toFixed();
      let tokenMin = new BigNumber(tokenDesired)
        .multipliedBy((100 - this.value1) / 100).toFixed();
      let ethMin = new BigNumber(ethDesired)
        .multipliedBy((100 - this.value1) / 100).toFixed();
      let nowTimeStamp = parseInt(new Date().getTime() / 1000);
      let deadline = nowTimeStamp + this.minutes * 60;

      let that = this;

      //请求区块
      router.methods
        .addLiquidityETH(
          tokenAddress,
          tokenDesired,
          tokenMin,
          ethMin,
          account,
          deadline,
        )
        .send({ from: account,value:ethDesired })
        .then(function(receipt) {
          // 清空
          that.inputammout1 = "";
          that.inputammout2 = "";
        });
    },
    
    //返回路由对象
    getRouterObj() {
      //TODO 地址后期放置在 入口文件中
      return new this.web3js.eth.Contract(
        Store.contracts.router.abi,
        Store.contracts.router.address
      );
    },
  },
  created() {
    //创建 web3js
    this.createWeb3Js();
  },
  mounted() {},
  filters: {}
};
</script>

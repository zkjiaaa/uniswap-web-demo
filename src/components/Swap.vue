<template>
<div>
    <h2>Swap</h2>
    <select v-model="from" @change="changeTokenA">
        <option v-for="token in listToken" :value="token.address">
            {{ token.name }}
        </option>
    </select>
    {{fromBalace}}
    <select v-model="to" @change="changeTokenB">
        <option v-for="token in listToken" :value="token.address">
            {{ token.name}}
        </option>
    </select>
    {{toBalance}}

    <button v-show="isTokenAApprover" @click="approveTokenA">Approved tokenA</button>
    <button v-show="isTokenBApprover" @click="approveTokenB">Approved tokenB</button>

    <br>
    <span>价格 : 1 tokenA = {{pairMiddlePrice}} tokenB</span>

    <br>

    <div>
        <h3>交易设置</h3>
        <label for="">
            滑点
            <input type="text" v-model="tradeSetting.spot"> %
        </label>
        <label for="">
            <input type="text" v-model="tradeSetting.minute"> 时限（分钟）
        </label>
    </div>

    <br>
    <div>
        <h3>交易数量</h3>
        <input type="text" v-model="fromNumber" @change="changeTokenANumber">
        <input type="text" v-model="toNumber" @change="changeTokenBNumber">
        <button @click="tokenSwap">Swap</button>
    </div>

</div>
</template>

<script>
//import {ethers, JsonRpcProvider} from "ethers";
import Web3 from "web3";
import {
    ethers
} from "ethers";
import Contract from "web3-eth-contract";
import Store from "../store/index.js";
import DEFAULT_TOKEN_LIST from "../store/rinkebyToken.json";
import ChainId from "../mixins/ChainId.js";
import BigNumber from "bignumber.js";
//Token ABI
import SeaToken from "../contracts/token.json";
import Factory from "../contracts/factory.json";
import Router from "../contracts/router.json";
import Pair from "../contracts/pair.json";

const chainId = ChainId.BSCTESTNET;
const DEFAULT_DECIMALS = 3;

export default {
    name: "Swap",
    data: function () {
        return {
            //TODO WETH 跳转时间
            WETH: '0x7b997DE373d2CDaC72411448D5fa67c5B10Ae816',
            //用户选择地址
            from: null,
            //用户 token A balance
            fromBalace: 0,
            //用户选择地址
            to: null,
            // 用户 token B balance
            toBalance: 0,
            //列表代币
            listToken: DEFAULT_TOKEN_LIST,
            //From 数量
            fromNumber: '',
            //To 数量
            toNumber: '',
            web3js: null,
            //用于记录 from 信息
            fromTokenInfo: null,
            //用于记录 to 信息
            toTokenInfo: null,
            //pair中间价格
            pairMiddlePrice: 0,
            //token A 是否需要批准
            isTokenAApprover: false,
            //token B 是否需要批准
            isTokenBApprover: false,
            //用户 from to 标记
            conventFlag: 0,
            //滑点
            tradeSetting: {
                spot: 10,
                minute: 20,
            }
        }
    },
    created() {
        this.createWeb3Js();
    },
    methods: {
        //查询 TokenA
        async changeTokenA() {
            this.fromBalace = 0;
            //获取当前选中的账户
            const account = await ethereum.selectedAddress;

            //判断 token A 是不是 等于 TokenB
            if (this.from == this.to) {
                this.from = null;
                return;
            }

            //判断输入是不是 WBNB
            if (this.from == this.WETH) {
                //查询 ETH 的余额
                this.fromTokenInfo = this.getWBNBObj();
                let balance = await this.web3js.eth.getBalance(account)
                this.fromBalace = new BigNumber(ethers.utils.formatEther(balance)).toFixed(DEFAULT_DECIMALS);
            } else {

                //查询 token 信息
                const tokenInfo = await this.getTokenInfo(this.from);
                this.fromTokenInfo = tokenInfo;
                //进行余额查询
                let token = this.getTokenObj(this.from);
                let currentBalance = await token.methods.balanceOf(account).call();
                this.fromBalace = (new BigNumber(ethers.utils.formatEther(currentBalance))).toFixed(DEFAULT_DECIMALS);
            }
            //调用查询价格方法
            this.searchPairPrice();
            //清除数量
            this.fromNumber = '';
        },

        //更换 TokenB
        async changeTokenB() {
            //判断 token A 是不是 等于 TokenB
            if (this.from == this.to) {
                this.from = null;
                return;
            }

            //TODO 这里最好修改为全局变量
            const account = await ethereum.selectedAddress;

            //判断输入是不是 WBNB
            if (this.to == this.WETH) {
                //查询 ETH 的余额
                this.toTokenInfo = this.getWBNBObj();
                let balance = await this.web3js.eth.getBalance(account)
                this.toBalance = new BigNumber(ethers.utils.formatEther(balance)).toFixed(DEFAULT_DECIMALS);
            } else {
                //TODO 这里最好修改为全局变量
                const account = await ethereum.selectedAddress;
                //查询 token 信息
                const tokenInfo = await this.getTokenInfo(this.to);
                this.toTokenInfo = tokenInfo;

                //进行余额查询
                let token = this.getTokenObj(this.to);
                let currentBalance = await token.methods.balanceOf(account)
                    .call();
                this.toBalance = (new BigNumber(ethers.utils.formatEther(currentBalance))).toFixed(DEFAULT_DECIMALS);
            }
            //调用当前查询价格方法
            this.searchPairPrice();
            //清除数量
            this.toNumber = '';
        },
        //获取 wBNB 信息
        getWBNBObj() {
            let info = {
                decimals: "18",
                name: "BNB",
                symbol: "BNB",
                totalSupply: "10000000000000000000000",
            };
            return info;
        },

        //获取 token 信息
        async getTokenInfo(tokenAddress) {
            const token = this.getTokenObj(tokenAddress);
            let info = {
                name: null,
                symbol: null,
                decimals: null,
                totalSupply: null,
            };
            //进行余额查询
            info.name = await token.methods.name().call().then();
            info.symbol = await token.methods.symbol().call().then();
            info.decimals = await token.methods.decimals().call().then();
            info.totalSupply = await token.methods.totalSupply().call().then();

            return info;
        },

        //获取 token 额度
        async getApproveLimit(owner, spender, tokenAddress) {
            let token = this.getTokenObj(tokenAddress);
            let approveLimit = await token.methods.allowance(owner, spender).call().then();
            return approveLimit;
        },

        //创建web3
        createWeb3Js() {
            this.web3js = new Web3(Web3.givenProvider || 'https://data-seed-prebsc-1-s1.binance.org:8545');
        },

        //查询
        async searchPairPrice() {
            //判断是否两个地址都为空 不查询价格
            if (this.from == null || this.to == null) {
                return;
            }

            //获取交易对地址
            let factory = this.getFactoryObj();
            let pairAddress = await factory.methods.getPair(this.from, this.to).call().then();

            if (pairAddress == '0x0000000000000000000000000000000000000000') {
                alert('你是第一个要交易，请提供流动性');
                return;
            }

            //创建交易对对象
            let pair = this.getPairObj(pairAddress);
            //计算出当前交易对流动池储蓄
            let pairReserve = await pair.methods.getReserves().call().then();
            let reserve0 = pairReserve._reserve0;
            let reserve1 = pairReserve._reserve1;

            //判断地址一是不是大于地址二
            let sortAddres = this.sortTokens(this.from, this.to);
            console.log('排序后地址：', sortAddres);
            //计算出兑换中间价
            let middlePrice = 0;

            if (sortAddres[0] == this.from) {
                middlePrice = reserve1 / reserve0;
            } else {
                middlePrice = reserve0 / reserve1;
            }
            //进行中间价赋值
            this.pairMiddlePrice = (new BigNumber(middlePrice)).toFixed(DEFAULT_DECIMALS);
        },

        //更换 token A 数量
        async changeTokenANumber() {
            const account = await ethereum.selectedAddress;

            //判断是否两个地址都为空 不查询价格
            if (this.from == null || this.to == null) {
                return;
            }

            //TODO 查询最优化的查询路径，目前只设置交易对之间的更换
            let pair = [this.from, this.to];

            //进行最大数量的获取
            let fromNumberBig = new BigNumber(this.fromNumber);
            let router = this.getRouterObj();
            let toNumber = await router.methods.getAmountsOut(fromNumberBig.multipliedBy(10 ** this.fromTokenInfo.decimals).toFixed(), pair).call().then();
            let toNumberBig = new BigNumber(toNumber[1]);
            //进行输出的修改
            this.toNumber = toNumberBig.div(10 ** this.toTokenInfo.decimals).toFixed(DEFAULT_DECIMALS);

            //查询当前币种额度是否超出了路由可调用额度，如果是则显示批准按钮
            let tokenApprove = await this.getApproveLimit(account, Store.contracts.router.address, this.from);
            if (tokenApprove == 0) {
                this.isTokenAApprover = true;
            }

            //标记方向
            this.conventFlag = 1;

        },

        //更换 token B 的数量
        async changeTokenBNumber() {
            const account = await ethereum.selectedAddress;

            //判断是否两个地址都为空 不查询价格
            if (this.from == null || this.to == null) {
                return;
            }

            //TODO 查询最优化的查询路径，目前只设置交易对之间的更换
            let pair = [this.from, this.to];

            //进行最大数量的获取
            let toNumberBig = new BigNumber(this.toNumber);
            let router = this.getRouterObj();
            let toNumber = await router.methods.getAmountsIn(toNumberBig.multipliedBy(10 ** this.toTokenInfo.decimals).toFixed(), pair).call().then();
            let fromNumberBig = new BigNumber(toNumber[0]);
            //进行输出的修改
            this.fromNumber = fromNumberBig.div(10 ** this.toTokenInfo.decimals).toFixed(DEFAULT_DECIMALS);

            //查询当前币种额度是否超出了路由可调用额度，如果是则显示批准按钮
            let tokenApprove = await this.getApproveLimit(account, Store.contracts.router.address, this.to);
            if (tokenApprove == 0) {
                this.isTokenBApprover = true;
            }

            //标记方向
            this.conventFlag = 2;
        },

        //进行 Swap
        async tokenSwap() {
            //获取当前用户的账号地址
            const account = await ethereum.selectedAddress;

            console.log('swap 地址', this.WETH, this.from, this.to);
            //判断相关的路由方法
            if (this.WETH == this.from) {
                this.swapExactETHForTokens(account, this.fromNumber, this.toNumber, this.toTokenInfo.decimals, [this.from, this.to]);
            } else if (this.WETH == this.to) {
                this.swapExactTokensForEth(account, this.toNumber, this.fromNumber, this.fromTokenInfo.decimals, [this.from, this.to]);
            } else {
                this.swapExactTokensForTokens(account);
            }
        },

        //填写 toToken 更换 fromToken
        async swapTokensForExactTokens(account) {
            let router = this.getRouterObj();
            let fromNumberBig = new BigNumber(this.fromNumber);
            let toNumberBig = new BigNumber(this.toNumber);

            //计算最小滑点后的数据
            let amountOut = toNumberBig.multipliedBy(10 ** this.toTokenInfo.decimals).toFixed();
            let amountInMax = fromNumberBig.multipliedBy(10 ** this.fromTokenInfo.decimals).multipliedBy((100 + this.tradeSetting.spot) / 100).toFixed();
            let path = [this.to, this.from];
            let to = account;
            let nowTimeStamp = parseInt(new Date().getTime() / 1000);
            let deadline = nowTimeStamp + (this.tradeSetting.minute * 60);

            console.log(amountOut, amountInMax, path, to, deadline);

            router.methods.swapTokensForExactTokens(amountOut, amountInMax, path, to, deadline)
                .send({
                    from: account
                })
                .on('confirmation', function (confirmationNumber, receipt) {
                    console.log('每当确认+1，就会调用此方法');
                })
                .on('receipt', function (receipt) {
                    console.log('交易成功信息')
                    console.log(receipt);
                });
        },

        //填写 fromToken 更换 toToken
        swapExactTokensForTokens(account) {
            let router = this.getRouterObj();
            let fromNumberBig = new BigNumber(this.fromNumber);
            let toNumberBig = new BigNumber(this.toNumber);
            //计算最小滑点后的数据
            let amountIn = fromNumberBig.multipliedBy(10 ** this.fromTokenInfo.decimals).toFixed();
            let amountOutMin = toNumberBig.multipliedBy(10 ** this.toTokenInfo.decimals).multipliedBy((100 - this.tradeSetting.spot) / 100).toFixed();
            let path = [this.from, this.to];
            let to = account;
            let nowTimeStamp = parseInt(new Date().getTime() / 1000);
            let deadline = nowTimeStamp + (this.tradeSetting.minute * 60);

            router.methods.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline)
                .send({
                    from: account
                })
                .on('confirmation', function (confirmationNumber, receipt) {
                    console.log('每当确认+1，就会调用此方法');
                })
                .on('receipt', function (receipt) {
                    console.log('交易成功信息')
                    console.log(receipt);
                });

        },

        // 精准 ETH 更换 token
        swapExactETHForTokens(account, eth, tokenNmber, tokenDecimals, path) {
            let router = this.getRouterObj();
            let toNumberBig = new BigNumber(tokenNmber);
            let ethNumber = ethers.utils.parseEther(eth).toString();
            let amountOutMin = toNumberBig.multipliedBy(10 ** tokenDecimals).multipliedBy((100 - this.tradeSetting.spot) / 100).toFixed();
            let to = account;
            let nowTimeStamp = parseInt(new Date().getTime() / 1000);
            let deadline = nowTimeStamp + (this.tradeSetting.minute * 60);

            console.log(amountOutMin, path, to, deadline);

            router.methods.swapExactETHForTokens(amountOutMin, path, to, deadline)
                .send({
                    from: account,
                    value: ethNumber
                })
                .on('confirmation', function (confirmationNumber, receipt) {
                    console.log('每当确认+1，就会调用此方法');
                })
                .on('receipt', function (receipt) {
                    console.log('交易成功信息')
                    console.log(receipt);
                });
        },

        //填写 精准token 数量更换 ETH
        swapExactTokensForEth(account, eth, tokenNmber, tokenDecimals, path) {
            let router = this.getRouterObj();
            let toNumberBig = new BigNumber(tokenNmber);
            let amountIn = toNumberBig.multipliedBy(10 ** tokenDecimals).toFixed();
            //计算滑点
            let amountOutMinString = ethers.utils.parseEther(eth).toString();
            let amountOutMin = new BigNumber(amountOutMinString).multipliedBy((100 - this.tradeSetting.spot) / 100).toFixed();

            let to = account;
            let nowTimeStamp = parseInt(new Date().getTime() / 1000);
            let deadline = nowTimeStamp + (this.tradeSetting.minute * 60);

            console.log(amountIn, amountOutMin, path, to, deadline);

            router.methods.swapExactTokensForETH(amountIn, amountOutMin, path, to, deadline)
                .send({
                    from: account
                })
                .on('confirmation', function (confirmationNumber, receipt) {
                    console.log('每当确认+1，就会调用此方法');
                })
                .on('receipt', function (receipt) {
                    console.log('交易成功信息')
                    console.log(receipt);
                });
        },

        async approveTokenA() {
            //获取当前用户的账号地址
            const account = await ethereum.selectedAddress;
            let res = await this.approveToken(this.from, account);
            console.log(res);
            //隐藏元素
            this.isTokenAApprover = false;

        },
        async approveTokenB() {
            //获取当前用户的账号地址
            const account = await ethereum.selectedAddress;
            let res = await this.approveToken(this.to, account);
            this.isTokenBApprover = false;
        },

        //批准用户 token
        async approveToken(tokenAddress, account) {
            let token = this.getTokenObj(tokenAddress);
            let approveTokenNumber = new BigNumber("1.157e+59").toFixed();
            //进行批准
            let result = await token.methods.approve(Store.contracts.router.address, approveTokenNumber).send({
                from: account
            }).on('receipt', function (receipt) {
                console.log(receipt);
            });

            return true;
        },

        //创建token实例
        getTokenObj(address) {
            //设置
            let contract = new this.web3js.eth.Contract(Store.contracts.seaToken.abi, address);
            return contract;
        },

        //获取交易对对象
        getPairObj(address) {
            let contract = new this.web3js.eth.Contract(Store.contracts.pair.abi, address);
            return contract;
        },

        //获取工厂对象
        getFactoryObj() {
            //TODO 地址后期放置在 入口文件中
            return new this.web3js.eth.Contract(Store.contracts.factory.abi, Store.contracts.factory.address);
        },

        //返回路由对象
        getRouterObj() {
            //TODO 地址后期放置在 入口文件中
            return new this.web3js.eth.Contract(Store.contracts.router.abi, Store.contracts.router.address);
        },

        // returns sorted token addresses, used to handle return values from pairs sorted in this order
        sortTokens(tokenA, tokenB) {
            let result;
            if (tokenA == tokenB) {
                console.log('aaaa')
                result = [tokenA, tokenB];
            }
            if (tokenA < tokenB) {
                console.log('bbbb')
                result = [tokenA, tokenB];
            } else {
                console.log('cccc')
                result = [tokenB, tokenA];
            }
            return result;
        }
    }
}
</script>

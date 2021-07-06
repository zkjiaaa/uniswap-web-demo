<template>
<div>
    <h2>Account Info</h2>
    <div>
    <button v-if="!isConnected" @click="connectWallet">connect</button>
    <span v-if="isConnected">Account : {{this.accounts[0]}} BNB : {{this.currentBalance}}</span>
    <br/>
    <br/>
    </div>
    

    <div>
        <button @click="changeType('swap')">Swap model</button>
        <button @click="changeType('liqidity')">Liqidity model</button>
        <div v-show="isSwap">
            <Swap/>
        </div>
        <div v-show="isLiqity">
            <Liqidity />
        </div>
    </div>

</div>
</template>

<script>
import {
    ethers
} from "ethers";
import Store from "../store/index.js";
import Swap from "../components/Swap";
import Liqidity from "../components/Liquidity";

export default {
    name: 'HelloWorld',
    data() {
        return {
            // ———————— user info
            //是否连接 metamask
            isConnected: false,
            //用户账号存储
            account: [],
            //当前连接的账号
            currentAccount: '',
            //当前账号的余额
            currentBalance: '0',
            //网络供应商
            provider: null,
            //模块
            isSwap: true,
            isLiqity: false,
        }
    },
    components: {
        Swap,
        Liqidity,
    },
    mounted() {
        //判断是否安装 metamask
        if (this.isMetaMaskInstalled()) {
            const {
                ethereum
            } = window
            //订阅账号修改机制
            ethereum.on('accountsChanged', this.handleNewAccounts)
            this.checkMetaMask()
        } else {
            console.log('please install metamask');
        }
    },
    //方法
    methods: {
        //判断用户是否安装了 metamask
        isMetaMaskInstalled() {
            const {
                ethereum
            } = window
            return Boolean(ethereum && ethereum.isMetaMask);
        },
        //重新记录用户的账号信息
        async handleNewAccounts(newAccounts) {
            this.accounts = newAccounts
            if (this.isMetaMaskConnected()) {
                //设置网络提供者
                this.provider = new ethers.providers.Web3Provider(window.ethereum)
                //获取用户余额
                let balance = await this.provider.getBalance(this.accounts[0])
                this.currentBalance = ethers.utils.formatEther(balance)
                this.isConnected = true
            } else {
                //测试
                console.log('unconnect metamask');
            }
        },
        //判断 MetaMask是否连接
        isMetaMaskConnected() {
            return this.accounts && this.accounts.length > 0
        },
        //获取两个币种的余额
        async getBalance() {
            const eth = await window.web3.eth.getBalance(account.address)
            console.log(eth);
            const tokenContract = new window.web3.eth.Contract(ERC20.abi, this.UNI);
            const token = await tokenContract.methods.balanceOf(account.address).call()
            console.log(token)
        },
        //检查 metamask 更新 账号信息
        async checkMetaMask() {
            const {
                ethereum
            } = window
            try {
                const newAccounts = await ethereum.request({
                    method: 'eth_accounts',
                })
                this.handleNewAccounts(newAccounts)
            } catch (err) {
                console.error('Error on init when getting accounts', err)
            }
        },
        //连接 metamask 
        async connectWallet() {
            this.checkMetaMask();
            console.log("connectting to wallet")
            const {
                ethereum
            } = window
            try {
                //连接 metamask
                await ethereum.enable();
                //获取用户账号
                const newAccounts = await ethereum.request({
                    method: 'eth_accounts',
                })
                //更新用户的账号
                this.handleNewAccounts(newAccounts)
            } catch (error) {
                console.error(error)
            }
        },
        //改变
        changeType(type) {
            if (type == 'swap') {
                this.isSwap = true;
                this.isLiqity = false;
            } else {
                this.isSwap = false;
                this.isLiqity = true;
            }
        }
    }
}
</script>
<!-- style -->

<style scoped>
h1,
h2 {
    font-weight: normal;
}

ul {
    list-style-type: none;
    padding: 0;
}

li {
    display: inline-block;
    margin: 0 10px;
}

a {
    color: #42b983;
}
</style>

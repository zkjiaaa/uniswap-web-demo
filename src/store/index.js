import FactoryAbi from "../contracts/factory.json";
import RouterAbi from "../contracts/router.json";
import PairAbi from "../contracts/pair.json";
import SeaTokenAbi from "../contracts/token.json";
//加载相关的 abi 文件

const state = {
  accounts: [],
  contracts: {
    router: {
      address: '0x4e5779b686f1ff27fc6FD88d592986C5C6669E5d',
      abi: RouterAbi,
    },
    factory: {
      address: '0x26DF448C993a51FEE6E0079A9fCf9331dd47b788',
      abi: FactoryAbi,
    },
    pair: {
      address: '0x19a14AA4532BA0e5C4Da456F3443DAc0b27868B1',
      abi: PairAbi,
    },
    seaToken: {
      address: '0xCCcF7c559f104A4e0B1BE3bd8Cd50ccA5D2bd5AE',
      abi: SeaTokenAbi,
    }
  }
}

export default state;
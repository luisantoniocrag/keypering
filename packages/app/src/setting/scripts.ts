import { LockScript } from '@keyper/specs'
import { Secp256k1LockScript } from '@keyper/container/lib/locks/secp256k1'
import { AnyPayLockScript } from '@keyper/container/lib/locks/anyone-can-pay'
import {
  SECP256K1_BLAKE160_CODE_HASH,
  SECP256K1_BLAKE160_MAINNET_TX_HASH,
  SECP256K1_BLAKE160_TESTNET_TX_HASH,
  ANYONE_CAN_PAY_CODE_HASH,
  ANYONE_CAN_PAY_TESTNET_TX_HASH,
} from '../utils'

const mainnetScripts: LockScript[] = [
  new Secp256k1LockScript(SECP256K1_BLAKE160_CODE_HASH, 'type', [
    {
      outPoint: {
        txHash: SECP256K1_BLAKE160_MAINNET_TX_HASH,
        index: '0x0',
      },
      depType: 'depGroup',
    },
  ]),
]

const testnetScripts: LockScript[] = [
  new Secp256k1LockScript(SECP256K1_BLAKE160_CODE_HASH, 'type', [
    {
      outPoint: {
        txHash: SECP256K1_BLAKE160_TESTNET_TX_HASH,
        index: '0x0',
      },
      depType: 'depGroup',
    },
  ]),

  new AnyPayLockScript(ANYONE_CAN_PAY_CODE_HASH, 'type', [
    {
      outPoint: {
        txHash: ANYONE_CAN_PAY_TESTNET_TX_HASH,
        index: '0x0',
      },
      depType: 'depGroup',
    },
  ]),
]
export default { mainnetScripts, testnetScripts }

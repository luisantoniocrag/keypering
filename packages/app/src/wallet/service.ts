import path from 'path'
import fs from 'fs'
import { Channel, KeyperingAgency } from '@keypering/specs'
import { getXpub, Keystore, checkPassword, decryptKeystore, getKeystoreFromXPrv } from './keystore'
import { getDataPath } from '../utils'
import {
  WalletNotFoundException,
  CurrentWalletNotSetException,
  RequestPasswordRejected,
  DirectoryNotFound,
} from '../exception'
import { deleteAuthList } from '../auth'
import PasswordWindow from './PasswordWindow'
import { dialog } from 'electron'
import MainWindow from '../MainWindow'
import signTx from '../keyper/sign'

const dataPath = getDataPath('wallet')
const indexPath = path.resolve(dataPath, 'index.json')

const broadcast = (walletIndex: ReturnType<typeof getWalletIndex>) => {
  MainWindow.broadcast<{ current: string; wallets: Channel.WalletProfile[] }>(
    Channel.ChannelName.GetWalletIndex,
    walletIndex
  )
}

const getKeystorePath = (id: string) => path.resolve(dataPath, `${id}.json`)

const udpateWalletIndex = (current: string, wallets: Channel.WalletProfile[]) => {
  fs.writeFileSync(indexPath, JSON.stringify({ current, wallets }))
  broadcast({ current, wallets })
}

export const getWalletIndex = (): { current: string; wallets: Channel.WalletProfile[] } => {
  if (fs.existsSync(indexPath)) {
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'))
  } else {
    return { current: '', wallets: [] }
  }
}

export const addKeystore = ({ name, password, keystore }: { name: string; password: string; keystore: Keystore }) => {
  const { wallets } = getWalletIndex()

  if (wallets.some(w => w.name === name)) {
    throw new Error(`Wallet name is used`)
  }

  if (wallets.some(w => w.id === keystore.id)) {
    throw new Error(`Wallet exists`)
  }

  const xpub = getXpub(keystore, password)

  const exist = wallets.find(w => w.xpub === xpub)

  if (exist) {
    throw new Error(`Wallet has been created as ${exist.name}`)
  }

  fs.writeFileSync(getKeystorePath(keystore.id), JSON.stringify(keystore))
  const profile = { name, xpub, id: keystore.id }
  udpateWalletIndex(profile.id, [...wallets, profile])
  return profile
}

export const selectWallet = (id: string) => {
  const { wallets } = getWalletIndex()
  if (!wallets.some(w => w.id === id)) {
    throw new WalletNotFoundException()
  }
  udpateWalletIndex(id, wallets)
}

export const updateWallet = ({ id, name }: { id: string; name: string }) => {
  const { wallets, current } = getWalletIndex()
  if (wallets.some(w => w.name === name)) {
    throw new Error(`Wallet name is used`)
  }
  const wallet = wallets.find(w => w.id === id)
  if (!wallet) {
    throw new WalletNotFoundException()
  }
  wallet.name = name
  udpateWalletIndex(current, wallets)
  return true
}

export const deleteWallet = async () => {
  const { current, wallets } = getWalletIndex()
  if (!current) {
    throw new CurrentWalletNotSetException()
  }
  const pwdWindow = new PasswordWindow('Password', 'Enter password to delete wallet')
  const approve = await pwdWindow.response()
  if (!approve) {
    throw new RequestPasswordRejected()
  }
  pwdWindow.close()

  const keystorePath = getKeystorePath(current)
  fs.unlinkSync(keystorePath)
  try {
    deleteAuthList(current)
  } catch (err) {
    console.error(err)
  }

  const newWallets = wallets.filter(w => w.id !== current)
  const newCurrent = newWallets.length > 0
    ? newWallets[0].id
    : ''
  if (newCurrent) {
    udpateWalletIndex(newCurrent, newWallets)
  } else {
    broadcast({ current: newCurrent, wallets: newWallets })
  }
  return newCurrent
}

export const getKeystoreByWalletId = (id: string) => {
  return JSON.parse(fs.readFileSync(getKeystorePath(id), 'utf8'))
}

export const exportKeystore = async () => {
  const { current } = getWalletIndex()
  if (!current) {
    throw new CurrentWalletNotSetException()
  }
  const keystore = getKeystoreByWalletId(current)
  const pwdWindow = new PasswordWindow('Password', 'Enter password to export keystore')
  const approve = await pwdWindow.response()
  if (!approve) {
    throw new RequestPasswordRejected()
  }
  pwdWindow.close()
  const { filePath, canceled } = await dialog.showSaveDialog({
    filters: [
      {
        name: 'keystore',
        extensions: ['json'],
      },
    ],
    defaultPath: 'keystore',
    title: 'Export',
    buttonLabel: 'Export',
  })
  if (canceled) {
    return false
  }
  if (typeof filePath !== 'string') {
    throw new DirectoryNotFound()
  }
  fs.writeFileSync(filePath, JSON.stringify(keystore), 'utf8')
  return true
}

export const checkCurrentPassword = (password: string) => {
  const { current } = getWalletIndex()
  if (!current) {
    throw new CurrentWalletNotSetException()
  }
  const keystore = JSON.parse(fs.readFileSync(getKeystorePath(current), 'utf8'))
  return checkPassword(keystore, password)
}

export const updateCurrentPassword = (currentPassword: string, newPassword: string) => {
  const { current, wallets } = getWalletIndex()
  if (!current) {
    throw new CurrentWalletNotSetException()
  }
  const name = wallets.filter(wallet => wallet.id === current)[0].name
  const keystore = JSON.parse(fs.readFileSync(getKeystorePath(current), 'utf8'))
  const xprv = decryptKeystore(keystore, currentPassword)
  const newWallets = wallets.filter(w => w.id !== current)
  const newKeystore = getKeystoreFromXPrv(Buffer.from(xprv, 'hex'), newPassword)
  const xpub = getXpub(newKeystore, newPassword)
  fs.unlinkSync(getKeystorePath(current))
  fs.writeFileSync(getKeystorePath(newKeystore.id), JSON.stringify(newKeystore))
  const profile = { name, xpub, id: newKeystore.id }
  udpateWalletIndex(profile.id, [...newWallets, profile])
  return true
}

interface SignTransactionParams {
  keystore: Keystore
  tx: CKBComponents.RawTransactionToSign & { hash: string }
  password: string
  lockHash: string
  signConfig?: KeyperingAgency.SignTransaction.InputSignConfig
}
export const signTransaction = async ({ keystore, tx, password, signConfig, lockHash }: SignTransactionParams) => {
  const xprv = decryptKeystore(keystore, password)
  const sk = `0x${xprv.slice(0, 64)}`
  const signed = await signTx(sk, { tx, lockHash, inputSignConfig: signConfig })
  return signed
}

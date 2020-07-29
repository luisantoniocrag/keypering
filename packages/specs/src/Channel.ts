export enum Code {
  Success = 0,
  Error = 1,
}

export enum ChannelName {
  CreateWallet = 'create-wallet',
  ImportKeystore = 'import-keystore',
  SelectWallet = 'select-wallet',
  DeleteWallet = 'delete-wallet',
  UpdateWallet = 'update-wallet',
  CheckCurrentPassword = 'check-current-password',
  GetMnemonic = 'get-mnemonic',
  GetSetting = 'get-setting',
  UpdateSetting = 'update-setting',
  GetWalletIndex = 'get-wallet-index',
  GetTxList = 'get-tx-list',
  RequestSign = 'request-sign',
  GetAddrList = 'get-addr-list',
  GetAuthList = 'get-auth-list',
  DeleteAuth = 'delete-auth',
  SubmitPassword = 'submit-password',
}

export type SuccessResponse<T = any> = {
  code: Code.Success
  result: T
}
export type ErrorResponse = {
  code: Code.Error
  message: string
}

// Wallet
export interface WalletProfile {
  name: string
  id: string
  xpub: string
}

export namespace GetWalletIndex {
  export type Response = SuccessResponse<{ current: string; wallets: WalletProfile[] }> | ErrorResponse
}

export namespace CreateWallet {
  export interface Params {
    name: string
    mnemonic: string
    password: string
  }
  export type Response = SuccessResponse<boolean> | ErrorResponse
}

export namespace ImportKeystore {
  export interface Params {
    name: string
    keystorePath: string
    password: string
  }
  export type Response = SuccessResponse<boolean> | ErrorResponse
}

export namespace DeleteWallet {
  export interface Params {
    id: string
    password: string
  }

  export type Response = SuccessResponse<boolean> | ErrorResponse
}

export namespace SelectWallet {
  export interface Params {
    id: string
  }
  export type Response = SuccessResponse<boolean> | ErrorResponse
}

export namespace UpdateWallet {
  export interface Params {
    id: string
    name: string
  }

  export type Response = SuccessResponse<boolean> | ErrorResponse
}

export namespace CheckCurrentPassword {
  export interface Params {
    password: string
  }
  export type Response = SuccessResponse<boolean> | ErrorResponse
}

export namespace GetMnemonic {
  export type Response = SuccessResponse<string> | ErrorResponse
}

// Setting
export interface Setting {
  locks: {
    [id: string]: {
      name: string
      enabled: boolean
      system: boolean
    }
  }

  networks: {
    [id: string]: {
      name: string
      url: string
    }
  }
  networkId: string
}

export namespace GetSetting {
  export type Response = SuccessResponse<Setting> | ErrorResponse
}

export namespace UpdateSetting {
  export interface LocksParams {
    lockIds: string[]
  }
  export interface NetworkParams {
    networkId: string
  }
  export type Params = LocksParams | NetworkParams
  export type Response = SuccessResponse<boolean> | ErrorResponse
}

export namespace GetAuthList {
  export interface AuthProfile {
    url: string
    time: string
  }

  export type Response = SuccessResponse<AuthProfile[]> | ErrorResponse
}

export namespace DeleteAuth {
  export interface Params {
    url: string
  }

  export type Response = SuccessResponse<boolean> | ErrorResponse
}

export namespace GetTxList {
  export interface TokenMeta {
    symbol: string
    amount: string
  }

  export interface TxProfile {
    origin: string
    meta: {
      [tokenName: string]: TokenMeta
    }
    chainType: 'ckb' | 'ckb_testnet' | 'ckb_devnet'
    isApproved: boolean
    time: string
  }

  export type Response = SuccessResponse<TxProfile[]> | ErrorResponse
}

export namespace RequestSign {
  export interface Params {
    tx: any
  }
  export type Response = SuccessResponse<any> | ErrorResponse
}

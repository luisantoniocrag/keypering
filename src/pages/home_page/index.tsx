import React, { useCallback, useState } from "react";
import { Button, NavBar, Tabs, Drawer, Icon, Flex, WhiteSpace, ActionSheet, WingBlank } from "antd-mobile";
import { withRouter } from "react-router";
import { Settings as SettingsIcon, Menu as MenuIcon } from "react-feather";
import { addressToScript } from "@keyper/specs";
import BN from "bn.js";
import Balance from "../../widgets/balance";
import AddressList from "../../widgets/address_list";
import styles from "./home.module.scss";
import TransactionList from "../../widgets/transaction_list";
import AuthorizationList from "../../widgets/authorization_list";
import Sidebar from "../../widgets/sidebar";
import WalletSelector from "../../widgets/wallet_selector";
import { WalletManager } from "../../services/wallet";
import * as indexer from "../../services/indexer";
import Storage from "../../services/storage";
import { sendAck } from "../../services/messaging";

const tabNames = [
  { title: "Addresses", key: "Addresses" },
  { title: "Transactions", key: "Transactions" },
  { title: "Authorization", key: "Authorization" },
];

class HomePage extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    const { history } = this.props;
    const manager = WalletManager.getInstance();
    const currentWallet = manager.getCurrentWallet();
    // sth weird...
    manager.loadWallets();
    const wallets = manager.getWallets();
    const { authorizations } = Storage.getStorage();
    this.state = {
      drawerOpen: false,
      wallets,
      currentWallet,
      addresses: [],
      balance: "0x0",
      authorizations,
    };

    if (!currentWallet) {
      history.push("/welcome");
    }
  }

  async componentDidMount() {
    // this.loadCurrentWalletAddressList();
    // this.loadAuthorizationList();
    const manager = WalletManager.getInstance();
    const { currentWalletName } = manager;
    await this.switchWallet(currentWalletName);
    window.document.addEventListener("ws-event", this.handleWsEvent);
  }

  componentWillUnmount() {
    window.document.removeEventListener("ws-event", this.handleWsEvent);
  }

  handleWsEvent = async (msg: any) => {
    const storage = Storage.getStorage();
    const { detail } = msg;
    console.log(detail);
    detail.data = JSON.parse(detail.data);
    const { data, token: wsToken } = detail;
    const { id, method, params } = data;
    storage.request = detail;
    const { history } = this.props;
    if (method === "auth") {
      history.push("/authorization_request");
    } else {
      const { token } = params;
      const auth = storage.getAuthorization(token);
      if (!auth) {
        sendAck(wsToken, {
          id,
          jsonrpc: "2.0",
          error: {
            code: 2,
            message: "invalid_token",
          },
        });
        return;
      }

      if (method === "query_locks") {
        const manager = WalletManager.getInstance();
        const addresses = await manager.loadCurrentWalletAddressList();
        // todo: addressToScript normalize
        const locks = addresses.map((addr: any) => addressToScript(addr.address));
        sendAck(wsToken, {
          id,
          jsonrpc: "2.0",
          result: {
            locks,
          },
        });
      } else if (method === "sign") {
        history.push("/transaction_request");
      }
    }
  };

  loadCurrentWalletAddressList = async () => {
    const { currentWallet } = this.state;
    if (!currentWallet) {
      return;
    }

    const manager = WalletManager.getInstance();
    const addresses = await manager.loadCurrentWalletAddressList();
    const cellsPromises = addresses.map((address: any) => indexer.getCells(address.meta.script));
    // const cellsPromises = addresses.map((address: any) =>
    //   indexer.getCells(addressToScript("ckt1qjr2r35c0f9vhcdgslx2fjwa9tylevr5qka7mfgmscd33wlhfykyhy3gzjh8k5zkkmyd4k58khyvggc2ks2uzrap8gu"))
    // );
    const addressCells = await Promise.all(cellsPromises);
    const addressSummary = addressCells.map((cells: any) => indexer.getSummary(cells));
    const balance = new BN(0);
    addressCells.forEach((address: any, i) => {
      addresses[i].freeAmount = `0x${addressSummary[i].free.toString(16)}`;
      addresses[i].inUseAmount = `0x${addressSummary[i].inuse.toString(16)}`;
      balance.iadd(addressSummary[i].free);
    });
    this.setState({
      addresses,
      balance: `0x${balance.toString(16)}`,
    });
  };

  loadAuthorizationList = () => {
    const { authorizations } = Storage.getStorage();
    this.setState({ authorizations });
  };

  handleToggleDrawer = () => {
    const { drawerOpen } = this.state;
    this.setState({
      drawerOpen: !drawerOpen,
    });
  };

  handleCloseDrawer = () => {
    this.setState({
      drawerOpen: false,
      walletSelectorOpen: false,
      transactionRequest: undefined,
    });
  };

  handleDrawerOpenChange = () => {
    let { drawerOpen } = this.state;
    drawerOpen = !drawerOpen;
    this.setState({
      drawerOpen,
    });
  };

  handleToggleWalletSelector = () => {
    const { walletSelectorOpen } = this.state;
    this.setState({
      walletSelectorOpen: !walletSelectorOpen,
    });
  };

  handleSelectWallet = (e: any) => {
    console.log(e);
    const walletName = e[0];
    this.switchWallet(walletName);
    this.setState({
      walletSelectorOpen: false,
    });
  };

  handleOpenSetting = () => {
    const { currentWallet } = this.state;
    const { history } = this.props;
    const BUTTONS = ["Change Wallet Name", "Change Password", "Backup Wallet", "Delete Wallet"];
    ActionSheet.showActionSheetWithOptions(
      {
        options: BUTTONS,
        destructiveButtonIndex: BUTTONS.length - 1,
        message: `${currentWallet.name} Setting`,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          // console.log("change wallet name");
          history.push("/change_wallet_name");
        } else if (buttonIndex === 1) {
          // console.log("change password");
          history.push("/change_password");
        } else if (buttonIndex === 2) {
          // console.log("backup wallet");
        } else if (buttonIndex === 3) {
          // console.log("delete wallet");
          history.push("/delete_wallet");
        } else {
          // console.log("should not be here");
        }
      }
    );
  };

  handleTestRequestSigning = () => {};

  handleTestAuthorizationRequest = () => {
    const { history } = this.props;
    const storage = Storage.getStorage();
    storage.request = {
      token: 0,
      data: {
        type: "auth",
        origin: "http://demodapp.com",
        description: "it is a demo dApp",
      },
    };
    history.push("/authorization_request");
  };

  handleRevokeAuthorization = (authToken: string) => {
    Storage.getStorage().removeAuthorization(authToken);
    this.loadAuthorizationList();
  };

  async switchWallet(walletName: string) {
    const manager = WalletManager.getInstance();
    manager.currentWalletName = walletName;
    const currentWallet = manager.getCurrentWallet();
    this.setState({
      currentWallet,
    });
    await this.loadCurrentWalletAddressList();
    await this.loadAuthorizationList();
  }

  render() {
    const {
      drawerOpen,
      walletSelectorOpen,
      wallets,
      currentWallet,
      transactionRequest,
      addresses,
      balance,
      authorizations,
    } = this.state;
    if (wallets.length <= 0 || !currentWallet) {
      return null;
    }
    return (
      <Flex direction="column">
        <div className={styles.header}>
          <NavBar
            className={styles.navbar}
            icon={<MenuIcon color="#fff" />}
            rightContent={<Icon type="ellipsis" onClick={this.handleOpenSetting} />}
            onLeftClick={this.handleToggleDrawer}
          >
            <div onClick={this.handleToggleWalletSelector}>
              {currentWallet.name}
              <Icon type="down" className={styles.downButton} />
            </div>
          </NavBar>
          <div className={styles.summary}>
            <div className={styles.balanceLabel}>Balance</div>
            <Balance value={balance} size="large" />
            <div className={styles.ops}>
              <Button inline type="primary" size="small">
                Send
              </Button>
            </div>
          </div>
        </div>
        {walletSelectorOpen && (
          <WalletSelector wallets={wallets} currentWallet={currentWallet} onSelect={this.handleSelectWallet} />
        )}
        <Drawer
          className={styles.drawer}
          sidebar={<Sidebar onClose={this.handleCloseDrawer} />}
          open={drawerOpen}
          onOpenChange={this.handleDrawerOpenChange}
        />
        <Flex.Item className={styles.tabs}>
          <Tabs
            tabs={tabNames}
            onChange={(tab, index) => {
              // console.log("onChange:", tab, index);
            }}
          >
            <WingBlank key="Addresses" className={styles.addresses}>
              <AddressList addresses={addresses} />
            </WingBlank>
            <WingBlank key="Transactions" className={styles.transactions}>
              <TransactionList />
            </WingBlank>
            <WingBlank key="Authorization" className={styles.authorizations}>
              <AuthorizationList authorizations={authorizations} onRevoke={this.handleRevokeAuthorization} />
            </WingBlank>
          </Tabs>
        </Flex.Item>
        <div className={styles.testRegion}>
          <Button inline size="small" onClick={this.handleTestAuthorizationRequest}>
            Request Auth(test)
          </Button>
          <Button inline size="small" onClick={this.handleTestRequestSigning}>
            Request Signing(test)
          </Button>
        </div>
      </Flex>
    );
  }
}

export default withRouter(HomePage);

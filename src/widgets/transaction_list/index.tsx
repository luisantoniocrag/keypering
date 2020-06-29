import React from "react";
import styles from "./transaction_list.module.scss";
import Transaction from "../transaction";

interface TransactionListProps {
  transactions: any[];
}

const TransactionList = ({ transactions }: TransactionListProps) => {
  return (
    <div>
      {transactions.map((tx) => {
        const { id, meta, rawTransaction } = tx;
        const { requestUrl, metaInfo, state, timestamp } = meta;
        return (
          <div className={styles.item} key={id}>
            <Transaction requestUrl={requestUrl} metaInfo={metaInfo} state={state} timestamp={timestamp} />
          </div>
        );
      })}
    </div>
  );
};

export default TransactionList;

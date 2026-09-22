import { addTodo, listTodos } from './todos'
import { getWalletBalance, topupWallet, createWalletCheckout, getWalletHistory } from './wallet'
import { listApiKeys, createApiKey, revokeApiKey } from './apiKeys'
import { joinWaitlist } from './waitlist'
import { listAddresses, createAddress, updateAddress, deleteAddress } from './addresses'
import { listOrders, submitOrderOtp, getSpent } from './orders'
import { updateName } from './user'

export default {
  listTodos,
  addTodo,
  waitlist: { join: joinWaitlist },
  wallet: {
    getBalance: getWalletBalance,
    getHistory: getWalletHistory,
    topup: topupWallet,
    createCheckout: createWalletCheckout,
  },
  apiKeys: { list: listApiKeys, create: createApiKey, revoke: revokeApiKey },
  addresses: {
    list: listAddresses,
    create: createAddress,
    update: updateAddress,
    delete: deleteAddress,
  },
  orders: {
    list: listOrders,
    submitOtp: submitOrderOtp,
    getSpent,
  },
  user: {
    updateName,
  },
}

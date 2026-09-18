import { addTodo, listTodos } from './todos'
import { getWalletBalance, topupWallet, createWalletCheckout, getWalletHistory } from './wallet'
import { checkInvite } from './invite'
import { listApiKeys, createApiKey, revokeApiKey } from './apiKeys'
import { joinWaitlist } from './waitlist'
import { listAddresses, createAddress, updateAddress, deleteAddress } from './addresses'
import { listOrders, submitOrderOtp } from './orders'
import { updateName } from './user'

export default {
  listTodos,
  addTodo,
  invite: { check: checkInvite },
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
  },
  user: {
    updateName,
  },
}

import { addTodo, listTodos } from './todos'
import { getWalletBalance, topupWallet } from './wallet'
import { searchShop, initiateOrder, listOrders } from './orders'
import { checkInvite } from './invite'
import { listApiKeys, createApiKey, revokeApiKey } from './apiKeys'

export default {
  listTodos,
  addTodo,
  invite: { check: checkInvite },
  wallet: {
    getBalance: getWalletBalance,
    topup: topupWallet,
  },
  shop: {
    search: searchShop,
    initiateOrder,
    listOrders,
  },
  apiKeys: { list: listApiKeys, create: createApiKey, revoke: revokeApiKey },
}

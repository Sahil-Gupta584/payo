import { addTodo, listTodos } from './todos'
import { getWalletBalance, topupWallet, createWalletCheckout } from './wallet'
import { checkInvite } from './invite'
import { listApiKeys, createApiKey, revokeApiKey } from './apiKeys'

export default {
  listTodos,
  addTodo,
  invite: { check: checkInvite },
  wallet: {
    getBalance: getWalletBalance,
    topup: topupWallet,
    createCheckout: createWalletCheckout,
  },
  apiKeys: { list: listApiKeys, create: createApiKey, revoke: revokeApiKey },
}

import { addTodo, listTodos } from './todos'
import { getWalletBalance, topupWallet, createWalletCheckout } from './wallet'
import { checkInvite } from './invite'
import { listApiKeys, createApiKey, revokeApiKey } from './apiKeys'
import { joinWaitlist } from './waitlist'

export default {
  listTodos,
  addTodo,
  invite: { check: checkInvite },
  waitlist: { join: joinWaitlist },
  wallet: {
    getBalance: getWalletBalance,
    topup: topupWallet,
    createCheckout: createWalletCheckout,
  },
  apiKeys: { list: listApiKeys, create: createApiKey, revoke: revokeApiKey },
}

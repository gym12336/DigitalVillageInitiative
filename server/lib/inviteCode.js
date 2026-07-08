// 队伍邀请码随机生成。建队时后端生成，唯一性由 teams.invite_code 的 UNIQUE 约束
// + 生成侧重试保证。纯函数、可注入随机源，便于测试可复现。

// 去掉易混字符（0/O、1/I/L）的字母数字表，人工抄写/口述更稳。
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LEN = 8

/**
 * 生成一个邀请码，如 'K7P2M9QX'。
 * @param {() => number} rand - 返回 [0,1) 的随机函数，默认 Math.random。测试可注入。
 */
export function makeInviteCode(rand = Math.random) {
  let code = ''
  for (let i = 0; i < CODE_LEN; i++) {
    code += ALPHABET[Math.floor(rand() * ALPHABET.length)]
  }
  return code
}

/**
 * 生成一个库中尚不存在的唯一邀请码。碰撞则重试，多次仍撞抛错（近乎不可能）。
 * @param {(code: string) => boolean} exists - 判断码是否已占用
 * @param {() => number} rand
 */
export function makeUniqueInviteCode(exists, rand = Math.random, maxTries = 10) {
  for (let i = 0; i < maxTries; i++) {
    const code = makeInviteCode(rand)
    if (!exists(code)) return code
  }
  throw new Error('生成唯一邀请码失败，请重试')
}

export { CODE_LEN, ALPHABET }

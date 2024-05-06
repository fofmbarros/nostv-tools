import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
}

const escapeXml = (text: string): string =>
    text.replace(
        /[<>&'"]/g,
        (c) =>
            `&${
                {
                    '<': 'lt',
                    '>': 'gt',
                    '&': 'amp',
                    "'": 'apos',
                    '"': 'quot'
                }[c]
            };`
    )

const sleep = async (seconds: number): Promise<unknown> =>
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000))

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url)

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(__filename)

export { addDays, escapeXml, sleep, __filename, __dirname }

import 'dotenv/config'
import path from 'node:path'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: env('DIRECT_URL'),
  },
  migrate: {
    async url() {
      return process.env.DIRECT_URL!
    },
  },
})


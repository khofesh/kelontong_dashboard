import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Role } from '@prisma/client'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<{ user: AuthUser }>()
    return request.user
  },
)

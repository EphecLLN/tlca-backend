import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
import { AuthenticationError } from 'apollo-server'
import { defaultFieldResolver } from 'graphql'

const authDirective = function (directiveName) {
  const typeDirectiveArgumentMaps = {}

  return {
    authDirectiveTypeDefs: `directive @${directiveName}(
      requires: [Role]
    ) on OBJECT | FIELD_DEFINITION

    enum Role {
        ADMIN
        MANAGER
        STUDENT
        TEACHER
        USER
    }`,
    authDirectiveTransformer: (schema) => {
      return mapSchema(schema, {
        [MapperKind.TYPE]: (type) => {
          const authDirective = getDirective(schema, type, directiveName)?.[0]
          if (authDirective) {
            typeDirectiveArgumentMaps[type.name] = authDirective
          }
          return undefined
        },
        [MapperKind.OBJECT_FIELD]: (fieldConfig, _fieldName, typeName) => {
          const authDirective =
            getDirective(schema, fieldConfig, directiveName)?.[0] ??
            typeDirectiveArgumentMaps[typeName]
          if (authDirective) {
            const { resolve = defaultFieldResolver } = fieldConfig
            fieldConfig.resolve = function (source, args, context, info) {
              if (!context.user) {
                throw new AuthenticationError('Not authorized')
              }

              const { requires } = authDirective
              if (requires) {
                if (
                  !requires.some((role) =>
                    context.user.roles.includes(role.toLowerCase())
                  )
                ) {
                  throw new AuthenticationError('Not authorized')
                }
              }

              return resolve(source, args, context, info)
            }
            return fieldConfig
          }
        },
      })
    },
  }
}

export const { authDirectiveTypeDefs, authDirectiveTransformer } =
  authDirective('auth')

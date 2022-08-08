import { UserInputError } from 'apollo-server'
import fs from 'fs-extra'
import path from 'path'

const resolvers = {
  Mutation: {
    async updateBanner(_parent, args, { models }, _info) {
      const { Course, Partner, Program } = models

      const type = args.type.toLowerCase() + 's'

      // Retrieve the document for which the banner has to be changed.
      const model = { courses: Course, partners: Partner, programs: Program }[
        type
      ]
      const document = await model.findOne({ code: args.code })

      if (!document) {
        throw new UserInputError(type + ' not found.')
      }

      // Create the banner image file at the right location on disk.
      try {
        const bannerPath = path.join(
          process.env.BANNER_DIRECTORY,
          type,
          document._id.toString(),
          'banner'
        )

        if (document.banner) {
          await fs.unlink(
            path.join(
              bannerPath,
              document.banner.slice(document.banner.lastIndexOf('/'))
            )
          )
        } else {
          await fs.mkdirp(bannerPath)
        }

        await fs.writeFile(
          path.join(bannerPath, args.name),
          args.image,
          'base64'
        )

        // Save the document updated with the new banner name into the database.
        document.banner = args.name
        await document.save()
        return {
          path: `/uploads/${type}/${document._id}/banner/${document.banner}`,
        }
      } catch (err) {
        console.log(err)
      }

      return null
    },
  },
}

export default resolvers

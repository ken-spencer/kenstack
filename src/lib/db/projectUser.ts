import { type ObjectId } from "mongodb";
type UserProjectionOptions = {
  alias?: string;
  projection?: Record<string, unknown>;
};

export type Avatar = {
  initials: string;
  url?: string;
};
export type User<
  Extra extends Record<string, unknown> = Record<string, never>
> = {
  _id: ObjectId;
  avatar: Avatar;
  name: string;
} & Extra;

const projectUser = ({
  alias = "",
  projection = {},
}: UserProjectionOptions = {}) => {
  if (alias && !alias.endsWith(".")) {
    alias += ".";
  }

  return {
    _id: 1,
    avatar: {
      initials: {
        $concat: [
          {
            $toUpper: {
              $substrCP: [{ $ifNull: [`$${alias}first_name`, ""] }, 0, 1],
            },
          },
          {
            $cond: [
              {
                $gt: [
                  { $strLenCP: { $ifNull: [`$${alias}last_name`, ""] } },
                  0,
                ],
              },
              {
                $toUpper: {
                  $substrCP: [`$${alias}last_name`, 0, 1],
                },
              },
              "",
            ],
          },
        ],
      },

      url: `$${alias}avatar.sizes.squareThumbnail.url`,
    },
    name: {
      $trim: {
        input: {
          $concat: [
            { $ifNull: [`$${alias}first_name`, ""] },
            " ",
            { $ifNull: [`$${alias}last_name`, ""] },
          ],
        },
      },
    },
    ...projection,
  };
};

export default projectUser;

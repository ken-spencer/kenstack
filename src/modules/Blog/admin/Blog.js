import NewsIcon from "@heroicons/react/24/outline/NewspaperIcon";

import Editor from "@admin/components/fields/Editor";
// import Library from "@admin/components/fields/Library";

const blogAdmin = {
  icon: NewsIcon,
  list: [
    ["title"],
  ],
  fields: {
    list: {
      label: "Blog",
      md: 12,
      lg: 6,
      fields: {
        title: {
          required: true,
        },
        slug: {
          label: "URL path",
          required: true,
          field: "slug",
          subscribe: "title",
        },
        description: {
          field: "TextArea",
          rows: 4,
        },
      },
    },
    body: {
      label: "Article content",
      md: 12,
      lg: 6,
      fields: {
        /*
        hero: {
          label: "Hero image",
          field: Library,
          
        },
        */
        body: {
          field: Editor,
        },
      }
    }
  },
};

export default blogAdmin;

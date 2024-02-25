import AdminSchema from "@thaumazo/cms/db/AdminSchema";

const BlogSchema = new AdminSchema({
  title: {
    type: String,
  }, 
  slug: {
    type: String,
    unique: true,    
  },
  description: String,
  body: String,
});

export default BlogSchema;

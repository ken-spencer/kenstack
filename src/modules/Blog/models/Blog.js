import AdminSchema from "@kenstack/db/AdminSchema";

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

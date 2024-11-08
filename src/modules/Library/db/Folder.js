import mongoose from "@kenstack/db";
import AdminSchema from "@kenstack/db/AdminSchema";

const FolderSchema = new AdminSchema({
  title: {
    type: String,
    required: true,
  },
  priority: {
    type: Number,
    index: true,
  },
  // parent: { type: Schema.Types.ObjectId, ref: "LibraryFolder", default: null },
  // children: [{ type: Schema.Types.ObjectId, ref: "LibraryFolder" }],
});

/*
// not relevent unless hierarchical. Thinking this makes it overly complex though. 
FolderSchema.pre("save", async function (next) {
  const folder = this;

  // Check if the folder is being moved or if it's a new folder with a parent
  if (folder.isModified("parent")) {
    // Retrieve the old folder document to access the old parent
    const oldFolder = await Folder.findById(folder._id);
    if (oldFolder && oldFolder.parent) {
      // Remove the folder from the old parent's children array
      await Folder.findByIdAndUpdate(oldFolder.parent, {
        $pull: { children: folder._id },
      });
    }
  }

  if (folder.parent) {
    // Add the folder to the new parent's children array
    await Folder.findByIdAndUpdate(folder.parent, {
      $addToSet: { children: folder._id },
    });
  }

  next();
});
*/

/*
FolderSchema.post("remove", async function (doc, next) {
  // Recursively delete all descendant folders
  const recursiveDelete = async (parentId) => {
    const children = await Folder.find({ parent: parentId });
    for (let child of children) {
      await recursiveDelete(child._id);
      await child.remove(); // This will trigger the 'remove' hook for each child
    }
  };

  await recursiveDelete(doc._id);

  next();
});
*/

FolderSchema.methods.toDTO = function () {
  return {
    id: this._id ? this._id.toString() : null,
    title: this.title,
    // parentId: this.parentId ? this.parentId.toString() : null,
    // children: [],
  };
};

const Folder = mongoose.addModel("LibraryFolder", FolderSchema);
export default Folder;

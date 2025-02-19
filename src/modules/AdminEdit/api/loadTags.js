export default async function loadTags(
  { field, exclude, keywords },
  { admin, model },
) {
  // const data = admin.form.get(field);

  const data = admin.form.fields[field];

  if (!data || data.field !== "tags") {
    return { error: "Invalid request" };
  }

  const pipeline = [
    { $unwind: `$${field}` },
    { $match: { [field]: { $exists: true, $ne: "" } } },
  ];

  if (Array.isArray(exclude) && exclude.length) {
    pipeline.push({ $match: { [field]: { $nin: exclude } } });
  }

  if (keywords) {
    pipeline.push({ $match: { [field]: { $regex: keywords, $options: "i" } } });
  }

  pipeline.push(
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 5 },
    { $project: { tag: "$_id", count: 1, _id: 0 } },
  );

  const result = await model.aggregate(pipeline);

  return {
    success: true,
    tags: result ? result.map(({ tag }) => tag) : [],
  };
}

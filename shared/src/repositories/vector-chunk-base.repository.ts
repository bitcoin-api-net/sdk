type VectorOrmModel = {
  findFirst: (...args: any[]) => any;
  findUnique: (...args: any[]) => any;
  findMany: (...args: any[]) => any;
  update: (...args: any[]) => any;
  updateMany: (...args: any[]) => any;
  delete: (...args: any[]) => any;
  deleteMany: (...args: any[]) => any;
  count: (...args: any[]) => any;
};

/**
 * Base for repositories backed by tables with `Unsupported("vector")` columns.
 * Prisma 7 disables `create`/`createMany`/`upsert` for such models — writes happen
 * via raw SQL inside child repositories (with `embedding ::vector`).
 */
export class VectorChunkBaseRepository<Model extends VectorOrmModel> {
  constructor(readonly model: Model) {}

  get findFirst(): Model['findFirst'] {
    return this.model.findFirst.bind(this.model) as Model['findFirst'];
  }

  get findUnique(): Model['findUnique'] {
    return this.model.findUnique.bind(this.model) as Model['findUnique'];
  }

  get findMany(): Model['findMany'] {
    return this.model.findMany.bind(this.model) as Model['findMany'];
  }

  get update(): Model['update'] {
    return this.model.update.bind(this.model) as Model['update'];
  }

  get updateMany(): Model['updateMany'] {
    return this.model.updateMany.bind(this.model) as Model['updateMany'];
  }

  get delete(): Model['delete'] {
    return this.model.delete.bind(this.model) as Model['delete'];
  }

  get deleteMany(): Model['deleteMany'] {
    return this.model.deleteMany.bind(this.model) as Model['deleteMany'];
  }

  get count(): Model['count'] {
    return this.model.count.bind(this.model) as Model['count'];
  }
}

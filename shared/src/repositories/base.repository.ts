type BaseOrmModel = {
  findFirst: (...args: any[]) => any;
  findFirstOrThrow: (...args: any[]) => any;
  findMany: (...args: any[]) => any;
  create: (...args: any[]) => any;
  createMany: (...args: any[]) => any;
  update: (...args: any[]) => any;
  updateMany: (...args: any[]) => any;
  upsert: (...args: any[]) => any;
  delete: (...args: any[]) => any;
  deleteMany: (...args: any[]) => any;
  count: (...args: any[]) => any;
  aggregate: (...args: any[]) => any;
  groupBy: (...args: any[]) => any;
};

export class BaseRepository<Model extends BaseOrmModel> {
  constructor(readonly model: Model) {}

  get findFirst(): Model['findFirst'] {
    return this.model.findFirst.bind(this.model) as Model['findFirst'];
  }

  get findFirstOrThrow(): Model['findFirstOrThrow'] {
    return this.model.findFirstOrThrow.bind(this.model) as Model['findFirstOrThrow'];
  }

  get findMany(): Model['findMany'] {
    return this.model.findMany.bind(this.model) as Model['findMany'];
  }

  get create(): Model['create'] {
    return this.model.create.bind(this.model) as Model['create'];
  }

  get createMany(): Model['createMany'] {
    return this.model.createMany.bind(this.model) as Model['createMany'];
  }

  get update(): Model['update'] {
    return this.model.update.bind(this.model) as Model['update'];
  }

  get updateMany(): Model['updateMany'] {
    return this.model.updateMany.bind(this.model) as Model['updateMany'];
  }

  get upsert(): Model['upsert'] {
    return this.model.upsert.bind(this.model) as Model['upsert'];
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

  get aggregate(): Model['aggregate'] {
    return this.model.aggregate.bind(this.model) as Model['aggregate'];
  }

  get groupBy(): Model['groupBy'] {
    return this.model.groupBy.bind(this.model) as Model['groupBy'];
  }
}

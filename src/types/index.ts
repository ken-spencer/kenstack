export type User<TRole extends string = string> = {
  id: number;
  impersonatedBy?: number;
  givenName: string;
  middleName: string;
  familyName: string;
  name: string;
  initials: string;
  avatar: { url: string; width: number | null; height: number | null } | null;
  email: string;
  roles: TRole[];
};

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

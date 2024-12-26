export interface StudentTokenPayload {
  id: string;
}

export enum AuthRole {
  Student = "student",
  Host = "host",
}

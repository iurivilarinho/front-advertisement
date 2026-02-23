export interface ClientApiDTO {
  id: number;
  tradeName: string;
  legalName: string;
  cnpj: string;
  stateRegistration?: string;
  branchCode?: string;
  phone?: string;
  email?: string;
  active: boolean;
}

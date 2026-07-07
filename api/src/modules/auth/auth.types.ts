export interface RegisterInput {
  companyName: string;
  companySlug?: string;
  adminName: string;
  email: string;
  password: string;
}

export interface TenantPublicView {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  createdAt: string;
}

export interface UserPublicView {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface RegisterResult {
  tenant: TenantPublicView;
  user: UserPublicView;
}

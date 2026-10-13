export interface AuthenticatedUser {
  sub: string;
  phone: string;
  role: string;
  studentId?: string;
  facilitatorId?: string;
  parentId?: string;
  tokenType: 'access';
}

export type UserRole =
  | 'student'
  | 'teacher_staff'
  | 'college_admin'
  | 'food_court_staff'
  | 'super_admin';

export type StaffPermission =
  | 'canteen_manager'
  | 'tour_360_curator'
  | 'notices_publisher'
  | 'rooms_manager';

export interface UserProfile {
  uid: string;
  role: UserRole;
  collegeId: string;
  name: string;
  email: string;
  photoURL?: string;
  status: UserStatus;
  createdAt: string;

  // Student specific
  department?: string;
  year?: string;
  division?: string;
  rollNumber?: string;
  studentId?: string;

  // Staff specific
  designation?: string;
  assignedFoodCourtId?: string;
  subjectsTaught?: string[];
  isClassTeacher?: boolean;
  permissions?: StaffPermission[];
}

export interface College {
  id: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  code: string;
  logoUrl?: string;
  tagline?: string;
  active: boolean;
  createdAt: string;
}

export interface Building {
  id: string;
  collegeId: string;
  name: string;
  code: string;
  floors: number;
}

export type RoomType =
  | 'Classroom'
  | 'Lab'
  | 'Library'
  | 'Canteen'
  | 'Auditorium'
  | 'Office'
  | 'Sports'
  | 'Other';

export interface Room {
  id: string;
  collegeId: string;
  buildingId: string;
  buildingName: string;
  floor: string;
  roomNumber: string;
  name: string;
  type: RoomType;
  department: string;
  capacity?: number;
  description: string;
  location360Id?: string;
}

export interface Faculty {
  id: string;
  collegeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  subjects: string[];
  officeRoom: string;
  photoURL?: string;
  isClassTeacher?: boolean;
  assignedDivision?: string;
}

export interface TimetableSlot {
  id: string;
  collegeId: string;
  department: string;
  year: string;
  division: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday... 6=Saturday
  dayName: string;
  startTime: string; // e.g. "09:00 AM"
  endTime: string; // e.g. "10:00 AM"
  subject: string;
  subjectCode?: string;
  room: string;
  facultyName: string;
  facultyId?: string;
  location360Id?: string;
}

export interface Campus360Location {
  id: string;
  collegeId: string;
  name: string;
  description: string;
  category: string;
  buildingId?: string;
  floor?: string;
  roomId?: string;
  thumbnail: string;
  embedUrl?: string;
  externalUrl?: string;
  embedCode?: string;
  active: boolean;
  displayOrder: number;
}

export interface FoodCourt {
  id: string;
  collegeId: string;
  name: string;
  location: string;
  active: boolean;
  openTime: string;
  closeTime: string;
}

export interface FoodCourtPayoutConfig {
  foodCourtId: string;
  collegeId: string;
  businessName: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiVpa: string;
  gatewayVendorId?: string; // Razorpay Route / Cashfree Vendor ID
  gatewayProvider: 'UPI_DIRECT' | 'RAZORPAY_ROUTE' | 'CASHFREE_SPLIT' | 'PHONEPE_PG';
  settlementSchedule: 'instant' | 'daily_t1';
  verified: boolean;
  updatedAt: string;
}

export type FoodCategory = 'All' | 'Popular' | 'Quick Bites' | 'Drinks' | 'Meals' | 'Snacks';

export interface FoodItem {
  id: string;
  collegeId: string;
  foodCourtId: string;
  name: string;
  category: FoodCategory;
  description: string;
  price: number;
  prepTimeMinutes: number;
  imageUrl?: string;
  available: boolean;
  isVeg: boolean;
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  imageUrl?: string;
}

export type PaymentMethod = 'UPI' | 'CASH';
export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'cash_pending'
  | 'cash_received';

export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "#CC1027"
  collegeId: string;
  foodCourtId: string;
  studentUid: string;
  studentName: string;
  studentIdentifier?: string; // Roll number or email
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  pickupOtp?: string; // Revealed to student & verified by backend
  createdAt: string;
  updatedAt: string;
  pickupVerifiedAt?: string;
  statusHistory?: OrderStatusHistoryItem[];
}

export interface PickupOtpRecord {
  orderId: string;
  collegeId: string;
  otp: string;
  attempts: number;
  maxAttempts: number;
  status: 'active' | 'used' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface Notice {
  id: string;
  collegeId: string;
  title: string;
  category: 'Event' | 'Campus' | 'Opportunity' | 'Urgent';
  timeAgo: string;
  date: string;
  summary: string;
  content: string;
  venue?: string;
  link?: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  collegeId: string;
  studentUid: string;
  amount: number;
  method: PaymentMethod;
  upiRef?: string;
  status: PaymentStatus;
  createdAt: string;
  verifiedAt?: string;
}

export interface FoodCourtPayoutConfig {
  foodCourtId: string;
  collegeId: string;
  businessName: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiVpa: string;
  gatewayProvider: 'UPI_DIRECT' | 'RAZORPAY_ROUTE' | 'CASHFREE_SPLIT' | 'PHONEPE_PG';
  settlementSchedule: 'instant' | 't_plus_1' | 't_plus_2';
  merchantAccountId?: string;
  verified: boolean;
  updatedAt: string;
}

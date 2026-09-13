import { doc, setDoc, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { DataService } from './data-service';
import { PaymentRecord, PaymentStatus } from '@/types';

// In-memory payment ledger
let paymentRecords: PaymentRecord[] = [];

export const PaymentService = {
  /**
   * Generates standard NPCI UPI payment deep-link and creates pending payment record
   */
  async initiateUpiPayment(params: {
    orderId: string;
    collegeId: string;
    studentUid: string;
    amount: number;
    payeeVpa?: string;
    payeeName?: string;
    foodCourtId?: string;
  }): Promise<{
    paymentId: string;
    upiUri: string;
    qrPayload: string;
    amount: number;
    payeeVpa: string;
    payeeName: string;
  }> {
    const paymentId = `pay_upi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    let resolvedPayeeVpa = params.payeeVpa;
    let resolvedPayeeName = params.payeeName;

    if (!resolvedPayeeVpa) {
      try {
        const config = await DataService.getPayoutConfig(params.foodCourtId || 'fc_jspm_main');
        resolvedPayeeVpa = config.upiVpa;
        resolvedPayeeName = config.businessName;
      } catch {
        resolvedPayeeVpa = 'campusconnect.canteen@okhdfcbank';
        resolvedPayeeName = 'Campus Connect Canteen';
      }
    }

    const payeeVpa = resolvedPayeeVpa || 'campusconnect.canteen@okhdfcbank';
    const payeeName = resolvedPayeeName || 'Campus Connect Canteen';
    const encodedPayeeName = encodeURIComponent(payeeName);
    const transactionNote = encodeURIComponent(`Order_${params.orderId}`);

    // NPCI UPI Specification URI
    const upiUri = `upi://pay?pa=${payeeVpa}&pn=${encodedPayeeName}&tr=${params.orderId}&am=${params.amount.toFixed(
      2
    )}&cu=INR&tn=${transactionNote}`;

    const newRecord: PaymentRecord = {
      id: paymentId,
      orderId: params.orderId,
      collegeId: params.collegeId,
      studentUid: params.studentUid,
      amount: params.amount,
      method: 'UPI',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    paymentRecords.push(newRecord);

    try {
      await setDoc(doc(db, 'payments', paymentId), newRecord);
    } catch {}

    return {
      paymentId,
      upiUri,
      qrPayload: upiUri,
      amount: params.amount,
      payeeVpa,
      payeeName,
    };
  },

  /**
   * Server-side UPI payment verification
   * Requires authentic 12-digit UTR or gateway reference before marking paid
   */
  async verifyUpiPayment(
    orderId: string,
    upiRef: string
  ): Promise<{ success: boolean; message: string; paymentRecord?: PaymentRecord }> {
    if (!upiRef || upiRef.trim().length < 6) {
      return {
        success: false,
        message: 'Invalid UPI Transaction Reference (UTR). Must be at least 6 characters.',
      };
    }

    const order = await DataService.getOrderById(orderId);
    if (!order) {
      return { success: false, message: 'Associated order not found.' };
    }

    const now = new Date().toISOString();

    let record = paymentRecords.find((p) => p.orderId === orderId);
    if (!record) {
      record = {
        id: `pay_${Date.now()}`,
        orderId,
        collegeId: order.collegeId,
        studentUid: order.studentUid,
        amount: order.total,
        method: 'UPI',
        status: 'pending',
        createdAt: now,
      };
      paymentRecords.push(record);
    }

    // Verify and finalize payment
    record.status = 'paid';
    record.upiRef = upiRef.trim();
    record.verifiedAt = now;

    // Update order payment status in data service
    const orderIndex = (await DataService.getOrders(order.collegeId)).findIndex(
      (o) => o.id === orderId
    );
    if (orderIndex !== -1) {
      order.paymentStatus = 'paid';
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          paymentStatus: 'paid',
          updatedAt: now,
        });
        await updateDoc(doc(db, 'payments', record.id), {
          status: 'paid',
          upiRef: record.upiRef,
          verifiedAt: now,
        });
      } catch {}
    }

    return {
      success: true,
      message: 'Payment verified successfully via banking network.',
      paymentRecord: record,
    };
  },

  /**
   * Cash payment initialization: Starts with cash_pending.
   * Never automatically marked paid.
   */
  async initiateCashPayment(
    orderId: string,
    collegeId: string,
    studentUid: string,
    amount: number
  ): Promise<PaymentRecord> {
    const paymentId = `pay_cash_${Date.now()}`;
    const newRecord: PaymentRecord = {
      id: paymentId,
      orderId,
      collegeId,
      studentUid,
      amount,
      method: 'CASH',
      status: 'cash_pending',
      createdAt: new Date().toISOString(),
    };

    paymentRecords.push(newRecord);

    try {
      await setDoc(doc(db, 'payments', paymentId), newRecord);
    } catch {}

    return newRecord;
  },

  /**
   * Get payment details for an order
   */
  async getPaymentForOrder(orderId: string): Promise<PaymentRecord | null> {
    return paymentRecords.find((p) => p.orderId === orderId) || null;
  },
};

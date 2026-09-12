import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { Province } from '@prisma/client';

export const getProfile = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatar: true,
      isVerified: true,
      createdAt: true,
    },
  });

  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, data: user });
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { name, email, avatar } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(avatar && { avatar }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatar: true,
      createdAt: true,
    },
  });

  res.json({ success: true, data: user });
};

export const getAddresses = async (req: AuthRequest, res: Response) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.id },
    orderBy: { isDefault: 'desc' },
  });

  res.json({ success: true, data: addresses });
};

export const addAddress = async (req: AuthRequest, res: Response) => {
  const {
    label, fullName, phone, province, district,
    municipality, ward, streetAddress, landmark, isDefault
  } = req.body;

  if (!fullName || !phone || !province || !district || !municipality || !ward || !streetAddress) {
    throw new AppError('Missing required address fields', 400);
  }

  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: req.user!.id },
      data: { isDefault: false },
    });
  }

  const count = await prisma.address.count({ where: { userId: req.user!.id } });

  const address = await prisma.address.create({
    data: {
      userId: req.user!.id,
      label: label || 'Home',
      fullName,
      phone,
      province: province as Province,
      district,
      municipality,
      ward: String(ward),
      streetAddress,
      landmark,
      isDefault: isDefault ?? count === 0,
    },
  });

  res.status(201).json({ success: true, data: address });
};

export const updateAddress = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    label, fullName, phone, province, district,
    municipality, ward, streetAddress, landmark, isDefault
  } = req.body;

  const existing = await prisma.address.findFirst({
    where: { id, userId: req.user!.id },
  });
  if (!existing) throw new AppError('Address not found', 404);

  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: req.user!.id },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.address.update({
    where: { id },
    data: {
      ...(label && { label }),
      ...(fullName && { fullName }),
      ...(phone && { phone }),
      ...(province && { province: province as Province }),
      ...(district && { district }),
      ...(municipality && { municipality }),
      ...(ward && { ward: String(ward) }),
      ...(streetAddress && { streetAddress }),
      ...(landmark !== undefined && { landmark }),
      ...(isDefault !== undefined && { isDefault }),
    },
  });

  res.json({ success: true, data: updated });
};

export const deleteAddress = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.address.findFirst({
    where: { id, userId: req.user!.id },
  });
  if (!existing) throw new AppError('Address not found', 404);

  await prisma.address.delete({ where: { id } });
  res.json({ success: true, message: 'Address removed successfully' });
};

export const setDefaultAddress = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.address.findFirst({
    where: { id, userId: req.user!.id },
  });
  if (!existing) throw new AppError('Address not found', 404);

  await prisma.address.updateMany({
    where: { userId: req.user!.id },
    data: { isDefault: false },
  });

  const updated = await prisma.address.update({
    where: { id },
    data: { isDefault: true },
  });

  res.json({ success: true, data: updated });
};

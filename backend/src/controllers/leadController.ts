import { Request, Response, NextFunction } from 'express';
import Lead from '../models/Lead';

interface LeadBody {
  name: string;
  email: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost';
  source: 'Website' | 'Instagram' | 'Referral';
}

interface PaginationResult {
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

interface LeadQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  source?: string;
  sort?: string;
}

export const createLead = async (
  req: Request<unknown, unknown, LeadBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, status, source } = req.body;

    if (!name || !email || !status || !source) {
      res.status(400).json({
        success: false,
        message: 'Name, email, status, and source are required.',
      });
      return;
    }

    const lead = await Lead.create({ name, email, status, source });

    res.status(201).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllLeads = async (
  req: Request<unknown, unknown, unknown, LeadQueryParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, limit, search, status, source, sort } = req.query;

    const currentPage = parseInt(page || '1', 10);
    const limitCount = parseInt(limit || '10', 10);

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (source) {
      filter.source = source;
    }

    const sortDirection: Record<string, 1 | -1> =
      sort === 'Oldest' ? { createdAt: 1 } : { createdAt: -1 };

    const totalRecords = await Lead.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limitCount);

    const leads = await Lead.find(filter)
      .sort(sortDirection)
      .skip((currentPage - 1) * limitCount)
      .limit(limitCount);

    const pagination: PaginationResult = {
      totalRecords,
      currentPage,
      totalPages,
      limit: limitCount,
    };

    res.status(200).json({
      success: true,
      data: leads,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getLeadById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      res.status(404).json({
        success: false,
        message: 'Lead not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLead = async (
  req: Request<{ id: string }, unknown, Partial<LeadBody>>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!lead) {
      res.status(404).json({
        success: false,
        message: 'Lead not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLead = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      res.status(404).json({
        success: false,
        message: 'Lead not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getContactedLeads = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contactedLeads = await Lead.find({
      status: { $in: ['Contacted', 'Qualified', 'Lost'] }
    }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: contactedLeads,
    });
  } catch (error) {
    next(error);
  }
};

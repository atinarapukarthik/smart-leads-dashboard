import { Request, Response } from 'express';
import User from '../models/User';
import Lead from '../models/Lead';
import Message from '../models/Message';
import Metric from '../models/Metric';

export const getSalesPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'Admin') {
      res.status(403).json({ success: false, message: 'Access denied. Admin role required.' });
      return;
    }

    const salesUsers = await User.find({ role: 'Sales User' }).select('-password');

    const metrics = await Metric.find({}).populate('salesUserId', 'name email');

    const enrichedMetrics = salesUsers.map((user) => {
      const userMetric = metrics.find(
        (m) => m.salesUserId && (m.salesUserId as any)._id.toString() === user._id.toString()
      );

      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        emailsSent: userMetric?.emailsSent || 0,
        repliesReceived: userMetric?.repliesReceived || 0,
        leadsQualified: userMetric?.leadsQualified || 0,
        leadsLost: userMetric?.leadsLost || 0,
        lastActive: userMetric?.lastActive || null,
        responseRate: userMetric?.emailsSent
          ? ((userMetric.repliesReceived / userMetric.emailsSent) * 100).toFixed(1)
          : '0.0',
        conversionRate: userMetric?.emailsSent
          ? ((userMetric.leadsQualified / userMetric.emailsSent) * 100).toFixed(1)
          : '0.0',
      };
    });

    const totalLeads = await Lead.countDocuments();
    const totalMessages = await Message.countDocuments();
    const outboundMessages = await Message.countDocuments({ direction: 'outbound' });
    const inboundMessages = await Message.countDocuments({ direction: 'inbound' });

    const statusBreakdown = await Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        salesPerformance: enrichedMetrics,
        overview: {
          totalLeads,
          totalMessages,
          outboundMessages,
          inboundMessages,
          statusBreakdown: statusBreakdown.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
          }, {} as Record<string, number>),
        },
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('[ANALYTICS] Sales performance error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch sales performance data' });
  }
};

export const getPersonalStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await Metric.findOne({ salesUserId: req.user?.id });

    const leadsCount = await Lead.countDocuments();

    const messagesSent = await Message.countDocuments({
      salesUserId: req.user?.id,
      direction: 'outbound',
    });

    res.json({
      success: true,
      data: {
        totalLeads: leadsCount,
        emailsSent: metrics?.emailsSent || 0,
        repliesReceived: metrics?.repliesReceived || 0,
        leadsQualified: metrics?.leadsQualified || 0,
        leadsLost: metrics?.leadsLost || 0,
        lastActive: metrics?.lastActive || null,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('[ANALYTICS] Personal stats error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch personal stats' });
  }
};
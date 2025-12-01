import pool from '../config/db';

export interface Channel {
  id: number;
  name: string;
  display_name: string;
  department_id: number | null;
  is_private: 'Y' | 'N';
  type: 'general' | 'announcement' | 'task' | 'meeting' | 'bot';
  slack_channel_id: string | null;
  is_active: 'Y' | 'N';
}

export class ChannelModel {
  static async findAllByUser(departmentId: number | null, role: 'ADMIN' | 'MEMBER') {
    let query = `
      SELECT c.*, 
             d.name as department_name, 
             d.display_name as department_display_name
      FROM Channels c 
      LEFT JOIN Departments d ON c.department_id = d.id
      WHERE c.is_active = 'Y'
    `;

    const params: any[] = [];

    if (role === 'MEMBER' && departmentId) {
      query += ` AND (c.department_id IS NULL OR c.department_id = ?)`;
      params.push(departmentId);
    }

    query += ` ORDER BY 
      c.department_id IS NULL DESC, 
      FIELD(c.type, 'announcement', 'task', 'meeting', 'general', 'bot'),
      d.display_name, 
      c.display_name
    `;

    const [rows] = await pool.execute(query, params);
    return rows as Channel[];
  }

  static async findBySlackChannel(slackChannelId: string) {
    const [rows] = await pool.execute(
      'SELECT * FROM Channels WHERE slack_channel_id = ? AND is_active = "Y"',
      [slackChannelId]
    );
    return (rows as Channel[])[0] || null;
  }

  static async create(channelData: {
    name: string;
    display_name: string;
    department_id?: number | null;
    is_private?: 'Y' | 'N';
    type?: 'general' | 'announcement' | 'task' | 'meeting' | 'bot';
    slack_channel_id?: string | null;
    is_active?: 'Y' | 'N';
  }) {
    const { 
      name, display_name, department_id = null, is_private = 'N', 
      type = 'general', slack_channel_id = null, is_active = 'Y' 
    } = channelData;

    const [result] = await pool.execute(
      `INSERT INTO Channels 
       (name, display_name, department_id, is_private, type, slack_channel_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, display_name, department_id, is_private, type, slack_channel_id, is_active]
    );

    return (result as any).insertId;
  }
}

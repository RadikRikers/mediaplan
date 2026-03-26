/** Корень оргструктуры — общее руководство (отдельно от медиаблока) */
export const LEADERSHIP_BLOCK_ID = 'blk-leadership';

/** Объединённый медиаблок и его подразделения */
export const MEDIA_ROOT_ID = 'blk-media';

export const MEDIA_SUB_BLOCK_IDS = ['blk-smm', 'blk-copy', 'blk-content'] as const;

export type MediaSubBlockId = (typeof MEDIA_SUB_BLOCK_IDS)[number];

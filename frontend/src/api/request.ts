import axios, { type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiEnvelope } from '@/types'
import { API_ERROR_CODE } from '@/types'

const ERROR_HINT: Record<number, string> = {
  [API_ERROR_CODE.BAD_PARAMS]: '参数错误',
  [API_ERROR_CODE.BAD_MEDIA]: '不支持的文件类型或文件过大',
  [API_ERROR_CODE.NOT_FOUND]: '资源不存在',
  [API_ERROR_CODE.CONFLICT]: '状态冲突',
  [API_ERROR_CODE.INTERNAL]: '服务内部错误',
  [API_ERROR_CODE.INFER_FAIL]: '推理失败',
  [API_ERROR_CODE.DEPENDENCY]: '依赖不可用（模型或机器人离线）',
}

export class ApiError extends Error {
  code: number
  data: unknown

  constructor(code: number, message: string, data: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.data = data
  }
}

const http = axios.create({
  baseURL: '/api/v1',
  timeout: 60000,
})

http.interceptors.response.use(
  (response) => {
    const contentType = String(response.headers['content-type'] || '')
    // 文件下载等非 JSON 原样返回
    if (!contentType.includes('application/json')) {
      return response
    }

    const body = response.data as ApiEnvelope<unknown>
    if (!body || typeof body.code !== 'number') {
      throw new ApiError(API_ERROR_CODE.INTERNAL, '响应缺少契约信封 {code,message,data}')
    }
    if (body.code !== API_ERROR_CODE.OK) {
      const hint = ERROR_HINT[body.code] || body.message || '请求失败'
      ElMessage.error(hint)
      throw new ApiError(body.code, body.message || hint, body.data)
    }
    return response
  },
  (error) => {
    const status = error.response?.status as number | undefined
    const body = error.response?.data as ApiEnvelope<unknown> | undefined
    if (body && typeof body.code === 'number') {
      const hint = ERROR_HINT[body.code] || body.message || '请求失败'
      ElMessage.error(hint)
      return Promise.reject(new ApiError(body.code, body.message || hint, body.data))
    }
    if (status === 404) {
      ElMessage.error(ERROR_HINT[API_ERROR_CODE.NOT_FOUND])
    } else if (!error.response) {
      ElMessage.error('无法连接后端服务')
    } else {
      ElMessage.error(ERROR_HINT[API_ERROR_CODE.INTERNAL])
    }
    return Promise.reject(error)
  },
)

export async function requestData<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await http.request<ApiEnvelope<T>>(config)
  return res.data.data
}

export { http }

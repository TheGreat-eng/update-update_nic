export const ERROR_MESSAGES = {
    FETCH_FARMS_FAILED: 'Không thể tải danh sách nông trại',
    FETCH_DEVICES_FAILED: 'Không thể tải danh sách thiết bị',
    DEVICE_CONTROL_FAILED: 'Điều khiển thiết bị thất bại',
    NETWORK_ERROR: 'Không thể kết nối đến máy chủ',
    TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn',
    UNAUTHORIZED: 'Bạn không có quyền thực hiện thao tác này',
} as const;

export const SUCCESS_MESSAGES = {
    DEVICE_CONTROLLED: 'Đã gửi lệnh điều khiển thiết bị',
    FARM_CREATED: 'Tạo nông trại thành công',
    FARM_UPDATED: 'Cập nhật nông trại thành công',
    FARM_DELETED: 'Xóa nông trại thành công',
    DEVICE_CREATED: 'Thêm thiết bị thành công',
    DEVICE_UPDATED: 'Cập nhật thiết bị thành công',
    DEVICE_DELETED: 'Xóa thiết bị thành công',
} as const;
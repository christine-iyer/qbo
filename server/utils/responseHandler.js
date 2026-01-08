class ResponseHandler {
  static success(res, data, message = 'Success') {
    return res.json({
      success: true,
      message,
      ...data
    });
  }

  static error(res, error, statusCode = 500) {
    const errorMessage = error.response?.data?.Fault?.Error?.[0]?.Detail || 
                        error.response?.data?.Fault?.Error?.[0]?.code || 
                        error.response?.data?.message || 
                        error.message ||
                        'An error occurred';

    console.error('Error:', errorMessage);
    console.error('Full error:', JSON.stringify(error.response?.data, null, 2));

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: error.response?.data?.Fault?.Error?.[0] || error.response?.data,
      fullError: error.response?.data
    });
  }

  static notAuthenticated(res) {
    return res.status(401).json({
      error: 'Not authenticated. Please connect to QuickBooks first.'
    });
  }

  static badRequest(res, message) {
    return res.status(400).json({
      error: message
    });
  }

  static notFound(res, message = 'Resource not found') {
    return res.status(404).json({
      error: message
    });
  }
}

module.exports = ResponseHandler;

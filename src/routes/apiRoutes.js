// Dashboard stats endpoint
router.get('/dashboard/stats', isLoggedIn, dashboardController.getDashboardStats); 
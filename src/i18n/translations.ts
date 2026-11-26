import type { Language } from '../types/auth';

export interface TranslationSchema {
  brandName: string;
  pageTitle: string;
  languageLabel: string;
  heroTitle: string;
  heroSubtitle: string;
  heroSteps: {
    title: string;
    description: string;
  }[];
  heroImageAlt: string;
  tabs: {
    signIn: string;
    signUp: string;
    forgotPassword: string;
  };
  signIn: {
    heading: string;
    subheading: string;
    loginLabel: string;
    loginPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    forgotLink: string;
    submit: string;
    orDivider: string;
    googleButton: string;
  };
  signUp: {
    heading: string;
    subheading: string;
    firstNameLabel: string;
    firstNamePlaceholder: string;
    lastNameLabel: string;
    lastNamePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    usernameHelp: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    passwordHelp: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    submit: string;
  };
  forgotPassword: {
    heading: string;
    subheading: string;
    emailLabel: string;
    emailPlaceholder: string;
    submit: string;
    backToSignIn: string;
  };
  otp: {
    step1Label: string;
    step2Label: string;
    verifyHeadingSignIn: string;
    verifyHeadingSignUp: string;
    verifyHeadingReset: string;
    codeSentTo: string;
    codeLabel: string;
    codeHelp: string;
    newPasswordLabel: string;
    newPasswordPlaceholder: string;
    confirmNewPasswordLabel: string;
    confirmNewPasswordPlaceholder: string;
    validityLabel: string;
    expiredNotice: string;
    attemptsRemaining: string;
    attemptsExhausted: string;
    resendButton: string;
    resendCooldown: string;
    verifySubmit: string;
    resetSubmit: string;
    changeDetails: string;
  };
  validation: {
    requiredFirstName: string;
    firstNameMaxLength: string;
    requiredLastName: string;
    lastNameMaxLength: string;
    requiredEmail: string;
    invalidEmail: string;
    requiredLogin: string;
    requiredUsername: string;
    invalidUsername: string;
    requiredPassword: string;
    passwordMinLength: string;
    passwordMaxLength: string;
    passwordMaxBytes: string;
    requiredConfirmPassword: string;
    passwordsDoNotMatch: string;
    newPasswordSameAsCurrent: string;
    requiredPhone: string;
    invalidPhone: string;
    phoneMaxLength: string;
    avatarInvalidType: string;
    avatarTooLarge: string;
    avatarInvalidDimensions: string;
    avatarReadError: string;
    humanCheckRequired: string;
    requiredOtp: string;
    invalidOtp: string;
  };
  humanCheck: {
    checkboxLabel: string;
    verifiedLabel: string;
    badgeLabel: string;
    promptLabel: string;
    refreshLabel: string;
    wrongAnswer: string;
    canvasAlt: string;
  };
  notifications: {
    sessionExpired: string;
    unauthorizedCleared: string;
    signedInSuccess: string;
    signedUpSuccess: string;
    passwordResetSuccess: string;
    loggedOut: string;
    profileRefreshed: string;
  };
  googleCallback: {
    loadingTitle: string;
    loadingSubtitle: string;
    errorTitle: string;
    conflictError: string;
    unverifiedError: string;
    failedError: string;
    missingCodeError: string;
    expiredOrInvalidCodeError: string;
    unauthorizedProfileError: string;
    backToLogin: string;
    startNewGoogleLogin: string;
  };
  workspace: {
    menuStore: string;
    menuMyOrders: string;
    menuCategories: string;
    menuBrands: string;
    menuBranches: string;
    menuProducts: string;
    menuAdminOrders: string;
    menuTelegramRecipients: string;
    menuSiteLogo: string;
    menuSiteAbout: string;
    menuAdminUsers: string;
    menuAdminStatistics: string;
    menuAdminAdvertisements: string;
    header: {
      moreButton: string;
      moreMenuAriaLabel: string;
      openMenuAriaLabel: string;
      closeMenuAriaLabel: string;
      homeAriaLabel: string;
      adminNavAriaLabel: string;
      adminSectionLabel: string;
      languageSwitchAriaLabel: string;
    };
    menuProfile: string;
    menuSecurity: string;
    breadcrumbRoot: string;
    logoutButton: string;
    refreshProfile: string;
    retryButton: string;
    checkingProfile: string;
    profileTitle: string;
    profileSubtitle: string;
    notProvided: string;
    fields: {
      email: string;
      username: string;
      role: string;
      language: string;
      firstName: string;
      lastName: string;
      phone: string;
      emailVerified: string;
      createdAt: string;
      updatedAt: string;
    };
    roleNames: {
      USER: string;
      ADMIN: string;
    };
    languageNames: {
      uz: string;
      ru: string;
    };
    avatar: {
      uploadButton: string;
      replaceButton: string;
      deleteButton: string;
      hint: string;
      uploadedSuccess: string;
      deletedSuccess: string;
      alt: string;
    };
    personalForm: {
      title: string;
      subtitle: string;
      firstNamePlaceholder: string;
      lastNamePlaceholder: string;
      phoneLabel: string;
      phonePlaceholder: string;
      phoneHelp: string;
      clearNote: string;
      saveButton: string;
      resetButton: string;
      savedSuccess: string;
    };
    usernameForm: {
      title: string;
      subtitle: string;
      label: string;
      placeholder: string;
      help: string;
      nextLoginNote: string;
      saveButton: string;
      savedSuccess: string;
    };
    languageForm: {
      title: string;
      subtitle: string;
      label: string;
      saveButton: string;
      savedSuccess: string;
    };
    emailChange: {
      title: string;
      subtitle: string;
      currentEmailLabel: string;
      newEmailLabel: string;
      newEmailPlaceholder: string;
      currentPasswordLabel: string;
      currentPasswordPlaceholder: string;
      sendCodeButton: string;
      verifyHeading: string;
      verifySubtitle: string;
      codeSentNotice: string;
      verifyButton: string;
      cancelButton: string;
      reloginNote: string;
    };
    passwordChange: {
      title: string;
      subtitle: string;
      currentPasswordLabel: string;
      currentPasswordPlaceholder: string;
      newPasswordLabel: string;
      newPasswordPlaceholder: string;
      confirmNewPasswordLabel: string;
      confirmNewPasswordPlaceholder: string;
      googleAccountNote: string;
      saveButton: string;
    };
    sessionCardTitle: string;
    sessionExpiresIn: string;
    sessionPolicyNote: string;
    googleInfoTitle: string;
    googleInfoBody: string;
    verifiedStatus: string;
    unverifiedStatus: string;
    profileCompletion: {
      title: string;
      missingPrefix: string;
      missingSuffix: string;
      fieldLabels: {
        firstName: string;
        lastName: string;
        phone: string;
      };
      phoneHelp: string;
      submitButton: string;
      savedSuccess: string;
    };
    storeHome: {
      welcomeTitle: string;
      welcomeSubtitle: string;
      readyBannerTitle: string;
      readyBannerSubtitle: string;
      openProfileTitle: string;
      openProfileDesc: string;
      openProfileAction: string;
      openSecurityTitle: string;
      openSecurityDesc: string;
      openSecurityAction: string;
      openCategoriesTitle: string;
      openCategoriesDesc: string;
      openCategoriesAction: string;
      openBrandsTitle: string;
      openBrandsDesc: string;
      openBrandsAction: string;
      openProductsTitle: string;
      openProductsDesc: string;
      openProductsAction: string;
    };
  };
  adminCategories: {
    title: string;
    subtitle: string;
    createButton: string;
    refreshButton: string;
    totalCountLabel: string;
    rootCategory: string;
    missingTranslation: string;
    activeLabel: string;
    inactiveLabel: string;
    incompleteToggleNotice: string;
    checkingPermissions: string;
    forbiddenTitle: string;
    forbiddenSubtitle: string;
    userRoleBlockedTitle: string;
    userRoleBlockedSubtitle: string;
    switchAccountButton: string;
    backendForbiddenTitle: string;
    backendForbiddenSubtitle: string;
    backendForbiddenEndpointLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    sortOrderShortLabel: string;
    backToStore: string;
    notFoundError: string;
    columns: {
      uzName: string;
      ruName: string;
      slug: string;
      parent: string;
      sortOrder: string;
      status: string;
      actions: string;
    };
    actions: {
      edit: string;
      delete: string;
      viewProducts: string;
      addProduct: string;
      deleteConfirmTitle: string;
      deleteConfirmDescription: string;
      deleteConfirmOk: string;
      deleteConfirmCancel: string;
    };
    form: {
      createTitle: string;
      editTitle: string;
      loadingCategory: string;
      generalSection: string;
      slugLabel: string;
      slugPlaceholder: string;
      slugGenerate: string;
      parentLabel: string;
      parentPlaceholder: string;
      sortOrderLabel: string;
      imageLabel: string;
      selectImageButton: string;
      replaceImageButton: string;
      removeImageButton: string;
      imageHint: string;
      imageAlt: string;
      activeLabel: string;
      uzSection: string;
      ruSection: string;
      nameLabel: string;
      namePlaceholderUz: string;
      namePlaceholderRu: string;
      descriptionLabel: string;
      descriptionPlaceholder: string;
      seoTitleLabel: string;
      seoTitlePlaceholder: string;
      seoDescriptionLabel: string;
      seoDescriptionPlaceholder: string;
      saveCreate: string;
      saveUpdate: string;
      cancel: string;
    };
    validation: {
      requiredSlug: string;
      slugMaxLength: string;
      requiredName: string;
      nameMaxLength: string;
      seoTitleMaxLength: string;
      invalidUuid: string;
      sortOrderMin: string;
      imageInvalidType: string;
      imageTooLarge: string;
      imageInvalidDimensions: string;
      imageReadError: string;
    };
    notifications: {
      createdSuccess: string;
      updatedSuccess: string;
      statusUpdatedSuccess: string;
      deletedSuccess: string;
    };
  };
  adminProducts: {
    title: string;
    subtitle: string;
    createButton: string;
    refreshButton: string;
    totalCountLabel: string;
    filterByCategoryLabel: string;
    allCategoriesOption: string;
    noCategory: string;
    noBrand: string;
    checkingPermissions: string;
    userRoleBlockedTitle: string;
    userRoleBlockedSubtitle: string;
    switchAccountButton: string;
    backendForbiddenTitle: string;
    backendForbiddenSubtitle: string;
    backendForbiddenEndpointLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyFilteredDescription: string;
    backToStore: string;
    notFoundError: string;
    warrantyMonthsSuffix: string;
    statusNames: {
      DRAFT: string;
      ACTIVE: string;
      ARCHIVED: string;
    };
    variantStatusNames: {
      ACTIVE: string;
      INACTIVE: string;
      DRAFT: string;
    };
    columns: {
      productName: string;
      slug: string;
      brand: string;
      categories: string;
      productKind: string;
      warranty: string;
      status: string;
      actions: string;
    };
    actions: {
      viewDetails: string;
      edit: string;
      delete: string;
      deleteConfirmTitle: string;
      deleteConfirmDescription: string;
      deleteConfirmOk: string;
      deleteConfirmCancel: string;
    };
    form: {
      createTitle: string;
      editTitle: string;
      loadingProduct: string;
      productSection: string;
      slugLabel: string;
      slugPlaceholder: string;
      slugGenerate: string;
      brandLabel: string;
      brandPlaceholder: string;
      categoriesLabel: string;
      categoriesPlaceholder: string;
      statusLabel: string;
      productKindLabel: string;
      productKindPlaceholder: string;
      warrantyMonthsLabel: string;
      warrantyMonthsPlaceholder: string;
      uzSection: string;
      ruSection: string;
      titleLabel: string;
      titlePlaceholderUz: string;
      titlePlaceholderRu: string;
      shortDescriptionLabel: string;
      shortDescriptionPlaceholder: string;
      descriptionLabel: string;
      descriptionPlaceholder: string;
      seoTitleLabel: string;
      seoTitlePlaceholder: string;
      seoDescriptionLabel: string;
      seoDescriptionPlaceholder: string;
      variantsSection: string;
      variantsLimitHint: string;
      addVariantButton: string;
      variantCardTitle: string;
      removeVariantButton: string;
      skuLabel: string;
      skuPlaceholder: string;
      barcodeLabel: string;
      barcodePlaceholder: string;
      variantStatusLabel: string;
      variantStatusPlaceholder: string;
      defaultTypeLabel: string;
      defaultTypeActive: string;
      defaultTypeMakeDefault: string;
      regularPriceLabel: string;
      regularPricePlaceholder: string;
      salePriceLabel: string;
      salePricePlaceholder: string;
      priceSectionHint: string;
      dimensionsOptionalTitle: string;
      weightGramsLabel: string;
      lengthMmLabel: string;
      widthMmLabel: string;
      heightMmLabel: string;
      imagesSectionLabel: string;
      selectImagesButton: string;
      imagesHint: string;
      noImagesYet: string;
      replaceImageButton: string;
      removeImageButton: string;
      moveImageUp: string;
      moveImageDown: string;
      primaryImageLabel: string;
      setPrimaryImageButton: string;
      sortOrderLabel: string;
      imageAlt: string;
      saveCreate: string;
      saveUpdate: string;
      cancel: string;
    };
    validation: {
      requiredSlug: string;
      slugMaxLength: string;
      requiredCategories: string;
      variantsRequired: string;
      variantsMaxLimit: string;
      requiredSku: string;
      skuMaxLength: string;
      titleRequiredAnyLang: string;
      pricePositive: string;
      priceDecimals: string;
      regularRequiredForSale: string;
      saleLessThanRegular: string;
      warrantyInvalid: string;
      nonNegativeInteger: string;
      imagesPerVariantLimit: string;
      uploadFilesTotalLimit: string;
      imageInvalidType: string;
      imageTooLarge: string;
      imageInvalidDimensions: string;
      imageReadError: string;
      conflictError: string;
      payloadTooLargeError: string;
      unsupportedMediaError: string;
    };
    notifications: {
      createdSuccess: string;
      updatedSuccess: string;
      deletedSuccess: string;
    };
    detail: {
      backToList: string;
      editProductButton: string;
      loadingTitle: string;
      metadataTitle: string;
      createdAtLabel: string;
      updatedAtLabel: string;
      publishedAtLabel: string;
      uzContentTitle: string;
      ruContentTitle: string;
      titleLabel: string;
      shortDescriptionLabel: string;
      descriptionLabel: string;
      seoTitleLabel: string;
      seoDescriptionLabel: string;
      emptyField: string;
      missingTranslationNotice: string;
      variantsTitle: string;
      variantsCountLabel: string;
      emptyVariantsTitle: string;
      emptyVariantsSubtitle: string;
      addNewVariantButton: string;
      barcodeLabel: string;
      variantStatusLabel: string;
      defaultVariantBadge: string;
      priceLabel: string;
      regularPriceLabel: string;
      salePriceLabel: string;
      noPrice: string;
      weightLabel: string;
      dimensionsLabel: string;
      noDimensions: string;
      galleryTitle: string;
      noImages: string;
      primaryImageBadge: string;
      sortOrderLabel: string;
      editVariantButton: string;
      deleteVariantButton: string;
      deleteVariantConfirmTitle: string;
      deleteVariantConfirmDescription: string;
      editImageButton: string;
      deleteImageButton: string;
      deleteImageConfirmTitle: string;
      deleteImageConfirmDescription: string;
      deleteConfirmOk: string;
      deleteConfirmCancel: string;
      variantDeletedSuccess: string;
      imageDeletedSuccess: string;
    };
  };
  adminBrands: {
    title: string;
    subtitle: string;
    createButton: string;
    refreshButton: string;
    totalCountLabel: string;
    searchPlaceholder: string;
    statusFilterLabel: string;
    statusFilterAll: string;
    statusFilterActive: string;
    statusFilterInactive: string;
    clearFilters: string;
    activeLabel: string;
    inactiveLabel: string;
    checkingPermissions: string;
    userRoleBlockedTitle: string;
    userRoleBlockedSubtitle: string;
    switchAccountButton: string;
    backendForbiddenTitle: string;
    backendForbiddenSubtitle: string;
    backendForbiddenEndpointLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyFilteredDescription: string;
    backToStore: string;
    notFoundError: string;
    columns: {
      brand: string;
      slug: string;
      status: string;
      actions: string;
    };
    actions: {
      view: string;
      edit: string;
      delete: string;
      deleteConfirmTitle: string;
      deleteConfirmDescription: string;
      deleteConfirmOk: string;
      deleteConfirmCancel: string;
    };
    messages: {
      createdSuccess: string;
      updatedSuccess: string;
      deletedSuccess: string;
      statusUpdatedSuccess: string;
    };
    form: {
      createTitle: string;
      editTitle: string;
      nameLabel: string;
      namePlaceholder: string;
      slugLabel: string;
      slugPlaceholder: string;
      generateSlugButton: string;
      slugHelp: string;
      activeLabel: string;
      activeHint: string;
      logoLabel: string;
      logoPickButton: string;
      logoReplaceButton: string;
      logoRemoveButton: string;
      logoHint: string;
      logoPreviewAlt: string;
      logoEmptyText: string;
      saveButton: string;
      cancelButton: string;
    };
    detail: {
      title: string;
      nameLabel: string;
      slugLabel: string;
      statusLabel: string;
      logoLabel: string;
      noLogo: string;
      editButton: string;
      deleteButton: string;
    };
    validation: {
      nameRequired: string;
      nameTooLong: string;
      slugRequired: string;
      slugTooLong: string;
      logoInvalidType: string;
      logoTooLarge: string;
      logoInvalidDimensions: string;
      logoReadError: string;
    };
  };
  catalog: {
    navCatalog: string;
    navBranches: string;
    navAbout: string;
    navSignIn: string;
    heroHeading: string;
    heroSubtitle: string;
    searchPlaceholder: string;
    allCategories: string;
    uncategorizedLabel: string;
    subcategoriesLabel: string;
    productsCountSuffix: string;
    categoriesCountSuffix: string;
    viewProduct: string;
    noImageLabel: string;
    variantCountSingle: string;
    variantCountPlural: string;
    skuPrefix: string;
    warrantyPrefix: string;
    warrantyMonthsSuffix: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyFilteredTitle: string;
    emptyFilteredDescription: string;
    clearFilters: string;
    retryButton: string;
    loadingLabel: string;
    productNotFoundTitle: string;
    productNotFoundSubtitle: string;
    backToCatalog: string;
    brandLabel: string;
    categoryLabel: string;
    productKindLabel: string;
    warrantyLabel: string;
    variantsTitle: string;
    defaultVariantLabel: string;
    selectedSkuLabel: string;
    specificationsTitle: string;
    weightLabel: string;
    weightUnit: string;
    dimensionsLabel: string;
    lengthLabel: string;
    widthLabel: string;
    heightLabel: string;
    mmUnit: string;
    descriptionTitle: string;
    orderButton: string;
    guestOrderHint: string;
    signedInOrderNoticeTitle: string;
    signedInOrderNoticeBody: string;
    postLoginOrderNoticeTitle: string;
    postLoginOrderNoticeBody: string;
    selectedSummaryLabel: string;
    completeProfileLink: string;
    noPriceLabel: string;
    addToCart: string;
    cartButtonLabel: string;
    cartTitle: string;
    cartEmptyTitle: string;
    cartEmptyDescription: string;
    cartClearButton: string;
    cartRemoveItem: string;
    cartUnitPrice: string;
    cartLineTotal: string;
    cartTotalLabel: string;
    cartItemsCountSuffix: string;
    cartOrderButton: string;
    cartOrderUnavailableTitle: string;
    cartOrderUnavailableBody: string;
    cartPostLoginTitle: string;
    cartPostLoginBody: string;
    cartNoPriceBlocked: string;
    decreaseQuantityLabel: string;
    increaseQuantityLabel: string;
    shareButton: string;
    shareAriaLabel: string;
    shareCopiedSuccess: string;
    shareFallbackTitle: string;
    shareFallbackDescription: string;
    shareFallbackSelectButton: string;
    shareFallbackClose: string;
    allCategoriesButton: string;
    allCategoriesModalTitle: string;
    chooseVariantButton: string;
    selectVariantModalTitle: string;
    inCartLabel: string;
    prevImageAriaLabel: string;
    nextImageAriaLabel: string;
    closeButton: string;
  };
  guestAuth: {
    modalTitle: string;
    modalSubtitle: string;
    selectedItemLabel: string;
    cartSummaryLabel: string;
    cartItemsUnit: string;
    signInTab: string;
    signUpTab: string;
    cancelButton: string;
  };
  productSocial: {
    sectionTitle: string;
    likeProductLabel: string;
    unlikeProductLabel: string;
    likeCommentLabel: string;
    unlikeCommentLabel: string;
    commentsCountSuffix: string;
    commentPlaceholder: string;
    commentSubmitButton: string;
    guestCommentHint: string;
    guestLoginPromptButton: string;
    replyButton: string;
    replyingToLabel: string;
    replyPlaceholder: string;
    replySubmitButton: string;
    cancelButton: string;
    viewRepliesButton: string;
    hideRepliesButton: string;
    loadingComments: string;
    loadingReplies: string;
    loadMoreComments: string;
    loadMoreReplies: string;
    emptyTitle: string;
    emptyDescription: string;
    editedLabel: string;
    deletedPlaceholder: string;
    editButton: string;
    saveEditButton: string;
    deleteButton: string;
    deleteConfirmTitle: string;
    deleteConfirmDescription: string;
    deleteConfirmOk: string;
    deleteConfirmCancel: string;
    validationRequired: string;
    validationMaxLength: string;
    commentCreatedSuccess: string;
    replyCreatedSuccess: string;
    commentUpdatedSuccess: string;
    commentDeletedSuccess: string;
    sessionRestoredNotice: string;
    ownCommentBadge: string;
    ownCommentAriaLabel: string;
    authorAvatarAltPrefix: string;
  };
  orders: {
    checkoutSectionTitle: string;
    checkoutSectionSubtitle: string;
    phoneLabel: string;
    phonePlaceholder: string;
    phoneHint: string;
    telegramLabel: string;
    telegramPlaceholder: string;
    telegramHint: string;
    fulfillmentTitle: string;
    fulfillmentMethods: {
      PICKUP: string;
      DELIVERY: string;
    };
    pickupMethodHint: string;
    deliveryMethodHint: string;
    selectBranchLabel: string;
    loadingBranches: string;
    noBranchesForMethod: string;
    branchesLoadError: string;
    deliveryAddressLabel: string;
    deliveryAddressPlaceholder: string;
    selectedAddressLabel: string;
    resolvingAddressLabel: string;
    approximateAddressBadge: string;
    approximateAddressHint: string;
    geocodeFallbackNote: string;
    selectPointPrompt: string;
    addressNoteLabel: string;
    addressNotePlaceholder: string;
    distanceUnavailable: string;
    nearestSortedHint: string;
    locationLabel: string;
    getLocationButton: string;
    gettingLocationLabel: string;
    locationPermissionDeniedHint: string;
    locationUnsupportedHint: string;
    locationFoundHint: string;
    latitudeLabel: string;
    longitudeLabel: string;
    mapPickHint: string;
    deliveryQuoteLoading: string;
    deliveryQuoteError: string;
    distanceLabel: string;
    ratePerKmLabel: string;
    deliveryFeeLabel: string;
    straightLineHint: string;
    estimatedTotalLabel: string;
    serverFinalTotalNote: string;
    submitOrderButton: string;
    editCartButton: string;
    itemsLimitError: string;
    itemQuantityLimitError: string;
    networkRetryHint: string;
    priceChangedNotice: string;
    orderCreatedTitle: string;
    orderReplayedTitle: string;
    orderNumberLabel: string;
    orderStatusLabel: string;
    placedAtLabel: string;
    contactLabel: string;
    fulfillmentSummaryTitle: string;
    branchLabel: string;
    paymentStatusLabel: string;
    paidAtLabel: string;
    unpaidLabel: string;
    cancellationReasonLabel: string;
    historyTitle: string;
    historyEmpty: string;
    subtotalLabel: string;
    discountTotalLabel: string;
    shippingTotalLabel: string;
    shippingZeroNote: string;
    grandTotalLabel: string;
    paymentPendingNote: string;
    viewMyOrdersButton: string;
    viewOrderDetailButton: string;
    continueShoppingButton: string;
    myOrdersTitle: string;
    myOrdersSubtitle: string;
    refreshButton: string;
    totalCountLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    goToCatalogButton: string;
    columns: {
      orderNumber: string;
      placedAt: string;
      status: string;
      itemsCount: string;
      grandTotal: string;
      actions: string;
    };
    viewDetailsAction: string;
    detailTitlePrefix: string;
    backToOrdersButton: string;
    loadingDetail: string;
    notFoundTitle: string;
    notFoundSubtitle: string;
    customerInfoTitle: string;
    itemsListTitle: string;
    unitPriceLabel: string;
    discountLabel: string;
    lineTotalLabel: string;
    quantityLabel: string;
    summaryTitle: string;
    orderProgressTitle: string;
    legacyStatusNote: string;
    cancelOrderButton: string;
    cancelModalTitle: string;
    cancelModalSubtitle: string;
    cancelReasonLabel: string;
    cancelReasonPlaceholder: string;
    cancelReasonRequired: string;
    cancelReasonMaxLength: string;
    cancelConfirmButton: string;
    cancelKeepOrderButton: string;
    cancelSuccessMessage: string;
    ratingSectionTitle: string;
    ratingFormPrompt: string;
    ratingStarsLabel: string;
    ratingRequiredError: string;
    ratingCommentLabel: string;
    ratingCommentPlaceholder: string;
    ratingCommentMaxLength: string;
    ratingSubmitButton: string;
    ratingSuccessMessage: string;
    ratedAtLabel: string;
    submittedReviewLabel: string;
    ratingOutOfFive: string;
    statusNames: {
      PENDING: string;
      NEW_UNPAID: string;
      NEW_PAID: string;
      CONFIRMED: string;
      PROCESSING: string;
      READY_FOR_PICKUP: string;
      PICKED_UP: string;
      READY_FOR_DELIVERY: string;
      SHIPPED: string;
      OUT_FOR_DELIVERY: string;
      DELIVERY_FAILED: string;
      DELIVERED: string;
      CANCELLED: string;
    };
    validation: {
      requiredPhone: string;
      invalidPhone: string;
      requiredTelegram: string;
      invalidTelegram: string;
      requiredBranch: string;
      requiredDeliveryAddress: string;
      requiredLocation: string;
      invalidLatitude: string;
      invalidLongitude: string;
      emptyCart: string;
    };
  };
  adminTelegramRecipients: {
    menuGroupLabel: string;
    title: string;
    subtitle: string;
    refreshButton: string;
    totalCountLabel: string;
    checkingPermissions: string;
    userRoleBlockedTitle: string;
    userRoleBlockedSubtitle: string;
    switchAccountButton: string;
    backendForbiddenTitle: string;
    backendForbiddenSubtitle: string;
    backendForbiddenEndpointLabel: string;
    backToStore: string;
    botNoteTitle: string;
    botNotePrivateChat: string;
    botNoteGroupChat: string;
    botNoteNoImmediateTest: string;
    formTitle: string;
    chatIdLabel: string;
    chatIdPlaceholder: string;
    chatIdHelp: string;
    labelLabel: string;
    labelPlaceholder: string;
    addButton: string;
    emptyTitle: string;
    emptyDescription: string;
    columns: {
      chatId: string;
      label: string;
      actions: string;
    };
    noLabel: string;
    deleteButton: string;
    deleteConfirmTitle: string;
    deleteConfirmDescription: string;
    deleteConfirmOk: string;
    deleteConfirmCancel: string;
    validation: {
      chatIdRequired: string;
      chatIdInvalid: string;
      labelMaxLength: string;
    };
    notifications: {
      createdSuccess: string;
      deletedSuccess: string;
    };
  };
  adminOrders: {
    title: string;
    subtitle: string;
    refreshButton: string;
    telegramSettingsButton: string;
    totalCountLabel: string;
    statusFilterLabel: string;
    allStatusesOption: string;
    orderNumberPlaceholder: string;
    clearFilters: string;
    emptyTitle: string;
    emptyDescription: string;
    columns: {
      orderNumber: string;
      placedAt: string;
      status: string;
      branch: string;
      fulfillment: string;
      payment: string;
      contact: string;
      grandTotal: string;
      actions: string;
    };
    paidBadge: string;
    unpaidBadge: string;
    viewDetailsAction: string;
    detailTitlePrefix: string;
    backToListButton: string;
    loadingDetail: string;
    notFoundTitle: string;
    notFoundSubtitle: string;
    statusSectionTitle: string;
    currentStatusLabel: string;
    availableTransitionsLabel: string;
    reasonModalTitle: string;
    reasonLabelDefault: string;
    reasonLabelPaid: string;
    reasonPlaceholderDefault: string;
    reasonPlaceholderPaid: string;
    reasonPlaceholderCancelled: string;
    reasonPlaceholderDeliveryFailed: string;
    reasonRequiredError: string;
    reasonMaxLengthError: string;
    confirmTransitionButton: string;
    cancelTransitionButton: string;
    fulfillmentSectionTitle: string;
    fulfillmentEditLockedHint: string;
    saveFulfillmentButton: string;
    testQuoteButton: string;
    fulfillmentUpdatedSuccess: string;
    statusUpdatedSuccess: string;
    conflictReloadNotice: string;
    customerInfoTitle: string;
    itemsListTitle: string;
    summaryTitle: string;
    historyTitle: string;
    historyActorLabel: string;
    historyEmpty: string;
    noContactValue: string;
    serviceRatingTitle: string;
  };
  adminBranches: {
    menuGroupLabel: string;
    title: string;
    subtitle: string;
    createButton: string;
    refreshButton: string;
    totalCountLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    columns: {
      image: string;
      name: string;
      address: string;
      phone: string;
      workingHours: string;
      status: string;
      services: string;
      pricePerKm: string;
      actions: string;
    };
    statusActive: string;
    statusInactive: string;
    statusArchived: string;
    pickupBadge: string;
    deliveryBadge: string;
    noServicesLabel: string;
    perKmSuffix: string;
    viewButton: string;
    editButton: string;
    archiveButton: string;
    archiveConfirmTitle: string;
    archiveConfirmDescription: string;
    archiveConfirmOk: string;
    archiveConfirmCancel: string;
    detailDrawerTitle: string;
    detailLoading: string;
    quoteTesterTitle: string;
    quoteTesterButton: string;
    drawerCreateTitle: string;
    drawerEditTitle: string;
    codeLabel: string;
    codePlaceholder: string;
    nameUzLabel: string;
    nameUzPlaceholder: string;
    nameRuLabel: string;
    nameRuPlaceholder: string;
    cityLabel: string;
    cityPlaceholder: string;
    addressLineLabel: string;
    addressLinePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    workingHoursLabel: string;
    workingHoursPlaceholder: string;
    pricePerKmLabel: string;
    activeLabel: string;
    pickupEnabledLabel: string;
    deliveryEnabledLabel: string;
    locationTitle: string;
    getLocationButton: string;
    gettingLocationLabel: string;
    resolvingAddressLabel: string;
    approximateAddressBadge: string;
    approximateAddressHint: string;
    geocodeFallbackHint: string;
    detectedAreaLabel: string;
    mapPickHint: string;
    imageSectionTitle: string;
    imageUploadHint: string;
    selectImageButton: string;
    replaceImageButton: string;
    removeImageButton: string;
    removeImageConfirm: string;
    saveButton: string;
    cancelButton: string;
    validation: {
      codeRequired: string;
      nameUzRequired: string;
      nameRuRequired: string;
      cityRequired: string;
      addressRequired: string;
      phoneRequired: string;
      invalidPhone: string;
      emailInvalid: string;
      workingHoursRequired: string;
      pricePerKmRequired: string;
      coordinatesRequired: string;
      imageInvalidType: string;
      imageTooLarge: string;
      imageUnreadable: string;
    };
    notifications: {
      createdSuccess: string;
      updatedSuccess: string;
      archivedSuccess: string;
      imageUpdatedSuccess: string;
      imageDeletedSuccess: string;
    };
  };
  branchesPage: {
    title: string;
    subtitle: string;
    getLocationButton: string;
    gettingLocationLabel: string;
    pickOnMapButton: string;
    hideMapButton: string;
    clearLocationButton: string;
    mapHint: string;
    selectedPointLabel: string;
    resolvingAddressLabel: string;
    sortedByNearestNotice: string;
    defaultOrderNotice: string;
    distanceLabel: string;
    distanceUnavailable: string;
    pickupAvailable: string;
    deliveryAvailable: string;
    emptyTitle: string;
    emptyDescription: string;
    refreshButton: string;
    workingHoursLabel: string;
    phoneLabel: string;
    totalBranchesLabel: string;
  };
  notificationsPanel: {
    bellAriaLabel: string;
    drawerTitle: string;
    unreadCountLabel: string;
    refreshButton: string;
    emptyTitle: string;
    emptyDescription: string;
    unreadLabel: string;
    readLabel: string;
    openOrderHint: string;
    statusAtEventLabel: string;
    reasonLabel: string;
    loadMoreButton: string;
    rateServiceAction: string;
  };
  adminSiteLogo: {
    title: string;
    subtitle: string;
    refreshButton: string;
    currentLogoTitle: string;
    currentLogoSubtitle: string;
    fallbackNote: string;
    uploadSectionTitle: string;
    fileHint: string;
    previewTitle: string;
    previewAlt: string;
    previewEmpty: string;
    selectFileButton: string;
    changeFileButton: string;
    resetSelectionButton: string;
    saveButton: string;
    savedSuccess: string;
    checkingPermissions: string;
    userRoleBlockedTitle: string;
    userRoleBlockedSubtitle: string;
    switchAccountButton: string;
    backendForbiddenTitle: string;
    backendForbiddenSubtitle: string;
    backendForbiddenEndpointLabel: string;
    backToStore: string;
    validation: {
      invalidType: string;
      tooLarge: string;
      invalidDimensions: string;
      unreadable: string;
    };
  };
  adminSiteAbout: {
    title: string;
    subtitle: string;
    refreshButton: string;
    retryButton: string;
    lastUpdatedLabel: string;
    notCreatedYet: string;
    emptyNoticeTitle: string;
    emptyNoticeDescription: string;
    uzSectionTitle: string;
    uzSectionBadge: string;
    ruSectionTitle: string;
    ruSectionBadge: string;
    titleLabel: string;
    titlePlaceholderUz: string;
    titlePlaceholderRu: string;
    descriptionLabel: string;
    descriptionPlaceholderUz: string;
    descriptionPlaceholderRu: string;
    saveButton: string;
    savedSuccess: string;
    loadErrorFallback: string;
    saveErrorFallback: string;
    savedPreviewTitle: string;
    savedPreviewSubtitle: string;
    checkingPermissions: string;
    userRoleBlockedTitle: string;
    userRoleBlockedSubtitle: string;
    switchAccountButton: string;
    backendForbiddenTitle: string;
    backendForbiddenSubtitle: string;
    backendForbiddenEndpointLabel: string;
    backToStore: string;
    validation: {
      titleRequiredUz: string;
      titleMaxLengthUz: string;
      descriptionRequiredUz: string;
      descriptionMaxLengthUz: string;
      titleRequiredRu: string;
      titleMaxLengthRu: string;
      descriptionRequiredRu: string;
      descriptionMaxLengthRu: string;
      socialUrlHttps: string;
      socialUrlMaxLength: string;
    };
    socialLinksSectionTitle: string;
    socialLinksSectionSubtitle: string;
    socialLinksUrlHint: string;
    socialLinksClearAllButton: string;
  };
  aboutPage: {
    pageTitle: string;
    defaultTitle: string;
    emptyTitle: string;
    emptyDescription: string;
    refreshButton: string;
    retryButton: string;
    lastUpdatedLabel: string;
    socialLinksTitle: string;
    backToStore: string;
  };
  adminUsers: {
    title: string;
    subtitle: string;
    refreshButton: string;
    retryButton: string;
    totalCountLabel: string;
    searchPlaceholder: string;
    searchMaxHint: string;
    roleFilterLabel: string;
    roleFilterAll: string;
    statusFilterLabel: string;
    statusFilterAll: string;
    clearFilters: string;
    checkingPermissions: string;
    userRoleBlockedTitle: string;
    userRoleBlockedSubtitle: string;
    switchAccountButton: string;
    backendForbiddenTitle: string;
    backendForbiddenSubtitle: string;
    backendForbiddenEndpointLabel: string;
    backToStore: string;
    notProvided: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyFilteredDescription: string;
    paginationTotalTemplate: string;
    roleNames: {
      USER: string;
      ADMIN: string;
    };
    statusNames: {
      ACTIVE: string;
      BLOCKED: string;
    };
    columns: {
      fullName: string;
      username: string;
      email: string;
      phone: string;
      role: string;
      status: string;
      createdAt: string;
      actions: string;
    };
    actions: {
      viewDetails: string;
      block: string;
      activate: string;
    };
    detail: {
      title: string;
      loading: string;
      accountIdLabel: string;
      fullNameLabel: string;
      firstNameLabel: string;
      lastNameLabel: string;
      usernameLabel: string;
      emailLabel: string;
      phoneLabel: string;
      roleLabel: string;
      statusLabel: string;
      languageLabel: string;
      emailVerificationLabel: string;
      emailVerifiedBadge: string;
      emailUnverifiedBadge: string;
      createdAtLabel: string;
      updatedAtLabel: string;
      adminImmutableNote: string;
      closeButton: string;
    };
    confirmModal: {
      blockTitle: string;
      blockDescription: string;
      blockSessionWarning: string;
      activateTitle: string;
      activateDescription: string;
      accountSummaryLabel: string;
      blockConfirmButton: string;
      activateConfirmButton: string;
      cancelButton: string;
    };
    notifications: {
      blockedSuccess: string;
      activatedSuccess: string;
      notFoundError: string;
    };
  };
  adminStatistics: {
    title: string;
    subtitle: string;
    refreshButton: string;
    retryButton: string;
    checkingPermissions: string;
    userRoleBlockedTitle: string;
    userRoleBlockedSubtitle: string;
    switchAccountButton: string;
    backendForbiddenTitle: string;
    backendForbiddenSubtitle: string;
    backendForbiddenEndpointLabel: string;
    backToStore: string;
    noData: string;
    periodBadgePrefix: string;
    currentStateBadge: string;
    timezoneLabel: string;
    tashkentTimezoneValue: string;
    presets: {
      last7: string;
      last30: string;
      last90: string;
      custom: string;
    };
    fromLabel: string;
    toLabel: string;
    limitLabel: string;
    validation: {
      invalidDates: string;
      fromAfterTo: string;
      maxDaysExceeded: string;
    };
    sections: {
      OVERVIEW: string;
      ORDERS: string;
      CATALOG: string;
      CUSTOMERS: string;
      BRANCHES: string;
      ENGAGEMENT: string;
      OPERATIONS: string;
    };
    emptyTitle: string;
    emptyDescription: string;
    tableExpandDetails: string;
    tableCollapseDetails: string;
    chartTableToggleShow: string;
    chartTableToggleHide: string;
    chartDateColumn: string;
    chartNoPoints: string;
    overview: {
      kpiSectionTitle: string;
      otherMetricsTitle: string;
      dailyChartTitle: string;
      dailyChartSubtitle: string;
      currencySectionTitle: string;
      openReportHint: string;
      series: {
        orders: string;
        registrations: string;
        comments: string;
        payments_marked: string;
      };
    };
    ordersSection: {
      byStatusTitle: string;
      byFulfillmentTitle: string;
      fulfillmentMetricsTitle: string;
      uniqueCustomers: string;
      cancellationsWithReason: string;
      averageRating: string;
      averageDistanceKm: string;
      ratingsTitle: string;
      starsSuffix: string;
      statusChangesTitle: string;
      fromStatusCol: string;
      toStatusCol: string;
      transitionsCol: string;
      topVariantsTitle: string;
      skuCol: string;
      productCol: string;
      ordersCountCol: string;
      unitsSoldCol: string;
      discountCol: string;
      totalAmountCol: string;
      currencyTotalsTitle: string;
      currencyCol: string;
      subtotalCol: string;
      shippingCol: string;
      paidMarkedCol: string;
      completedAmountCol: string;
      multiCurrencyNote: string;
    };
    catalogSection: {
      inventoryTitle: string;
      qualityTitle: string;
      distributionsTitle: string;
      translationsTitle: string;
      productTranslationsTitle: string;
      categoryTranslationsTitle: string;
      topCategoriesTitle: string;
      topBrandsTitle: string;
      nameCol: string;
      slugCol: string;
      statusCol: string;
      productsCountCol: string;
      activeLabel: string;
      inactiveLabel: string;
      withoutImages: string;
      withoutActivePrice: string;
      withoutCategory: string;
      withoutBrand: string;
      productStatuses: string;
      productKinds: string;
      variantStatuses: string;
      categoryStatuses: string;
      brandStatuses: string;
      languageCol: string;
      recordsCountCol: string;
    };
    customersSection: {
      accountsTitle: string;
      distributionsTitle: string;
      byRoleTitle: string;
      byStatusTitle: string;
      byLanguageTitle: string;
      orderFrequencyTitle: string;
      dailyRegistrationsTitle: string;
      ordersBucketUnit: string;
    };
    branchesSection: {
      byStatusTitle: string;
      capabilitiesTitle: string;
      branchOrdersTitle: string;
      branchCol: string;
      unassignedBranch: string;
      currencyCol: string;
      methodCol: string;
      totalOrdersCol: string;
      cancelledCol: string;
      completedCol: string;
      completedAmountCol: string;
      shippingAmountCol: string;
      avgDistanceCol: string;
      avgRatingCol: string;
    };
    engagementSection: {
      commentsTitle: string;
      likesTitle: string;
      currentLikesSubtitle: string;
      dailyCommentsTitle: string;
      topLikedTitle: string;
      topCommentedTitle: string;
      productCol: string;
      likesCountCol: string;
      commentsCountCol: string;
    };
    operationsSection: {
      siteTitle: string;
      mediaTitle: string;
      verificationTitle: string;
      queuesTitle: string;
      notificationsQueueTitle: string;
      emailQueueTitle: string;
      telegramQueueTitle: string;
      configuredLabel: string;
      notConfiguredLabel: string;
      mediaTypeCol: string;
      filesCountCol: string;
      totalSizeCol: string;
      purposeCol: string;
      issuedCol: string;
      usedCol: string;
      expiredCol: string;
    };
    labels: Record<string, string>;
  };
  adminAdvertisements: {
    title: string;
    subtitle: string;
    createButton: string;
    refreshButton: string;
    retryButton: string;
    checkingPermissions: string;
    userRoleBlockedTitle: string;
    userRoleBlockedSubtitle: string;
    switchAccountButton: string;
    backendForbiddenTitle: string;
    backendForbiddenSubtitle: string;
    backendForbiddenEndpointLabel: string;
    backToStore: string;
    searchPlaceholder: string;
    channelFilterLabel: string;
    statusFilterLabel: string;
    allChannels: string;
    allStatuses: string;
    clearFilters: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyFilteredTitle: string;
    emptyFilteredDescription: string;
    totalCountSuffix: string;
    channels: {
      WEB: string;
      APP: string;
    };
    statuses: {
      DRAFT: string;
      PUBLISHED: string;
      PAUSED: string;
      ARCHIVED: string;
    };
    visibilities: {
      DRAFT: string;
      SCHEDULED: string;
      LIVE: string;
      ENDED: string;
      PAUSED: string;
      ARCHIVED: string;
    };
    mediaKinds: {
      IMAGE: string;
      VIDEO: string;
      NONE: string;
    };
    columns: {
      title: string;
      media: string;
      channels: string;
      schedule: string;
      status: string;
      updatedAt: string;
      actions: string;
    };
    scheduleUnlimited: string;
    scheduleFromPrefix: string;
    scheduleToPrefix: string;
    editStatusPrefix: string;
    revisionPrefix: string;
    sortOrderLabel: string;
    actions: {
      edit: string;
      view: string;
      history: string;
      publish: string;
      pause: string;
      archive: string;
    };
    drawer: {
      createTitle: string;
      editTitle: string;
      viewArchivedTitle: string;
      archivedReadOnlyNotice: string;
      uzSectionTitle: string;
      ruSectionTitle: string;
      titleLabel: string;
      titlePlaceholderUz: string;
      titlePlaceholderRu: string;
      descriptionLabel: string;
      descriptionPlaceholderUz: string;
      descriptionPlaceholderRu: string;
      channelsLabel: string;
      channelsHint: string;
      targetUrlLabel: string;
      targetUrlPlaceholder: string;
      targetUrlHint: string;
      scheduleSectionTitle: string;
      timezoneNoticePrefix: string;
      startsAtLabel: string;
      endsAtLabel: string;
      clearDateButton: string;
      utcPreviewPrefix: string;
      sortOrderLabel: string;
      sortOrderHint: string;
      mediaSectionTitle: string;
      mediaHint: string;
      selectMediaButton: string;
      changeMediaButton: string;
      resetSelectedMediaButton: string;
      currentSavedMediaLabel: string;
      newSelectedMediaLabel: string;
      noMediaNotice: string;
      mediaLoadError: string;
      mediaNotFound: string;
      saveButton: string;
      saveDraftButton: string;
      cancelButton: string;
      closeButton: string;
      conflictBannerTitle: string;
      loadLatestVersionButton: string;
      applyServerValuesButton: string;
      latestVersionLoadedNotice: string;
    };
    validation: {
      uzTitleRequired: string;
      uzTitleMax: string;
      uzDescriptionMax: string;
      ruTitleRequired: string;
      ruTitleMax: string;
      ruDescriptionMax: string;
      channelsRequired: string;
      targetUrlInvalid: string;
      sortOrderInvalid: string;
      endsAfterStarts: string;
      mediaInvalidType: string;
      mediaImageTooLarge: string;
      mediaVideoTooLarge: string;
      mediaInvalidDimensions: string;
      mediaUnreadable: string;
      publishMediaRequired: string;
      publishEndsAtPast: string;
      reasonMax: string;
    };
    archiveModal: {
      title: string;
      subtitle: string;
      reasonLabel: string;
      reasonPlaceholder: string;
      confirmButton: string;
      cancelButton: string;
    };
    history: {
      title: string;
      subtitle: string;
      emptyTitle: string;
      emptyDescription: string;
      actorLabel: string;
      systemActor: string;
      reasonLabel: string;
      viewVersionButton: string;
      snapshotModalTitle: string;
      channelsLabel: string;
      targetUrlLabel: string;
      scheduleLabel: string;
      sortOrderLabel: string;
      statusLabel: string;
      mediaLabel: string;
      noMediaInVersion: string;
      actions: Record<string, string>;
    };
    notifications: {
      createdSuccess: string;
      updatedSuccess: string;
      publishedSuccess: string;
      pausedSuccess: string;
      archivedSuccess: string;
      loadDetailError: string;
      notFoundError: string;
    };
  };
}

export const translations: Record<Language, TranslationSchema> = {
  uz: {
    brandName: 'Oson Market',
    pageTitle: 'Oson Market — Kirish va Profil',
    languageLabel: 'Tilni tanlang',
    heroTitle: 'Oson Market bilan kundalik xaridlar yanada qulay',
    heroSubtitle:
      'Minglab sifatli mahsulotlar, tezkor yetkazib berish va qulay to‘lov usullari bitta platformada.',
    heroSteps: [
      {
        title: 'Keng mahsulot tanlovi',
        description: 'Elektronika, uy-ro‘zg‘or buyumlari va kundalik zarur tovarlarning boy assortimenti.',
      },
      {
        title: 'Tezkor yetkazib berish',
        description: 'Buyurtmalaringizni qisqa muddatda eshigingizgacha yoki topshirish punktiga yetkazamiz.',
      },
      {
        title: 'Qulay buyurtma nazorati',
        description: 'Sevimli mahsulotlarni saqlang va buyurtma holatini istalgan vaqtda kuzatib boring.',
      },
    ],
    heroImageAlt: 'Oson Market zamonaviy savdo va xizmat ko‘rsatish markazi',
    tabs: {
      signIn: 'Kirish',
      signUp: 'Ro‘yxatdan o‘tish',
      forgotPassword: 'Parolni tiklash',
    },
    signIn: {
      heading: 'Hisobga kirish',
      subheading: 'Username yoki email va parolingizni kiriting. Tasdiqlash kodi pochtangizga yuboriladi.',
      loginLabel: 'Username yoki Email',
      loginPlaceholder: 'buyer_01 yoki buyer@example.com',
      passwordLabel: 'Parol',
      passwordPlaceholder: 'Parolingizni kiriting',
      forgotLink: 'Parolni unutdingizmi?',
      submit: 'Tasdiqlash kodini olish',
      orDivider: 'yoki',
      googleButton: 'Google bilan kirish',
    },
    signUp: {
      heading: 'Yangi hisob yaratish',
      subheading: 'Ro‘yxatdan o‘tish uchun ma’lumotlaringizni kiriting.',
      firstNameLabel: 'Ism',
      firstNamePlaceholder: 'Zafar',
      lastNameLabel: 'Familiya',
      lastNamePlaceholder: 'Ziyatov',
      emailLabel: 'Elektron pochta',
      emailPlaceholder: 'buyer@example.com',
      usernameLabel: 'Foydalanuvchi nomi',
      usernamePlaceholder: 'buyer_01',
      usernameHelp: '3–64 ta lotin harfi, raqam yoki pastki chiziq (_)',
      passwordLabel: 'Parol',
      passwordPlaceholder: 'Kamida 8 ta belgi',
      passwordHelp: '8–72 belgi (UTF-8 da 72 baytgacha)',
      confirmPasswordLabel: 'Parolni tasdiqlang',
      confirmPasswordPlaceholder: 'Parolni qayta kiriting',
      submit: 'Ro‘yxatdan o‘tishni boshlash',
    },
    forgotPassword: {
      heading: 'Parolni tiklash',
      subheading: 'Hisobingizga biriktirilgan elektron pochtani kiriting. Tasdiqlash kodi pochtangizga yuboriladi.',
      emailLabel: 'Elektron pochta',
      emailPlaceholder: 'buyer@example.com',
      submit: 'Tiklash kodini yuborish',
      backToSignIn: 'Kirish sahifasiga qaytish',
    },
    otp: {
      step1Label: 'Ma’lumotlar',
      step2Label: 'Tasdiqlash',
      verifyHeadingSignIn: 'Kirishni tasdiqlang',
      verifyHeadingSignUp: 'Akkauntni tasdiqlang',
      verifyHeadingReset: 'Yangi parol o‘rnating',
      codeSentTo: 'Kod yuborilgan manzil',
      codeLabel: '6 raqamli tasdiqlash kodi',
      codeHelp: 'Boshidagi nollarni saqlagan holda 6 ta raqamni kiriting (masalan: 004321).',
      newPasswordLabel: 'Yangi parol',
      newPasswordPlaceholder: 'Yangi xavfsiz parol kiriting',
      confirmNewPasswordLabel: 'Yangi parolni tasdiqlang',
      confirmNewPasswordPlaceholder: 'Yangi parolni qayta kiriting',
      validityLabel: 'Kod amal qilish vaqti',
      expiredNotice: 'Kod muddati tugagan bo‘lishi mumkin. Yangi kod so‘rang.',
      attemptsRemaining: 'Qolgan urinishlar',
      attemptsExhausted: 'Noto‘g‘ri urinishlar limiti tugadi. Yangi kod so‘rang.',
      resendButton: 'Yangi kod so‘rash',
      resendCooldown: 'Qayta so‘rash',
      verifySubmit: 'Tasdiqlash va kirish',
      resetSubmit: 'Parolni yangilash',
      changeDetails: 'Orqaga qaytish',
    },
    validation: {
      requiredFirstName: 'Ismni kiriting',
      firstNameMaxLength: 'Ism 100 ta belgidan oshmasligi kerak',
      requiredLastName: 'Familiyani kiriting',
      lastNameMaxLength: 'Familiya 100 ta belgidan oshmasligi kerak',
      requiredEmail: 'Elektron pochtani kiriting',
      invalidEmail: 'To‘g‘ri elektron pochta manzilini kiriting',
      requiredLogin: 'Username yoki email kiriting',
      requiredUsername: 'Foydalanuvchi nomini kiriting',
      invalidUsername: '3–64 ta lotin harfi, raqam yoki _ ishlatilishi kerak',
      requiredPassword: 'Parolni kiriting',
      passwordMinLength: 'Parol kamida 8 ta belgidan iborat bo‘lishi kerak',
      passwordMaxLength: 'Parol 72 ta belgidan oshmasligi kerak',
      passwordMaxBytes: 'Parol 72 baytdan oshmasligi kerak',
      requiredConfirmPassword: 'Parolni tasdiqlang',
      passwordsDoNotMatch: 'Parollar mos kelmadi',
      newPasswordSameAsCurrent: 'Yangi parol joriy paroldan farqli bo‘lishi kerak',
      requiredPhone: 'Telefon raqamingizni kiriting',
      invalidPhone: 'Telefon raqamdan boshlanishi kerak (oldiga + qo‘yish mumkin; raqam, probel, qavs va defis)',
      phoneMaxLength: 'Telefon raqami 32 ta belgidan oshmasligi kerak',
      avatarInvalidType: 'Faqat PNG yoki JPEG formatidagi rasm yuklang',
      avatarTooLarge: 'Rasm hajmi 2 MB dan oshmasligi kerak',
      avatarInvalidDimensions: 'Rasm o‘lchami 2048×2048 pikseldan oshmasligi kerak',
      avatarReadError: 'Rasm faylini o‘qib bo‘lmadi',
      humanCheckRequired: 'Robot emasligingizni tasdiqlang',
      requiredOtp: '6 raqamli kodni kiriting',
      invalidOtp: 'Kod aniq 6 ta raqamdan iborat bo‘lishi kerak',
    },
    humanCheck: {
      checkboxLabel: 'Men robot emasman',
      verifiedLabel: 'Tasdiqlandi: siz robot emassiz',
      badgeLabel: 'Himoya',
      promptLabel: 'Davom etish uchun to‘g‘ri javobni tanlang:',
      refreshLabel: 'Yangi misol',
      wrongAnswer: 'Noto‘g‘ri javob, qayta urinib ko‘ring',
      canvasAlt: 'Tekshiruv misoli',
    },
    notifications: {
      sessionExpired: 'Sessiya muddati tugadi. Qaytadan kiring.',
      unauthorizedCleared: 'Sessiya yaroqsiz. Iltimos, qaytadan kiring.',
      signedInSuccess: 'Hisobga muvaffaqiyatli kirdingiz.',
      signedUpSuccess: 'Akkaunt muvaffaqiyatli yaratildi.',
      passwordResetSuccess: 'Parol yangilandi. Endi yangi parol bilan kirishingiz mumkin.',
      loggedOut: 'Hisobdan chiqdingiz.',
      profileRefreshed: 'Profil ma’lumotlari yangilandi.',
    },
    googleCallback: {
      loadingTitle: 'Google orqali kirilmoqda...',
      loadingSubtitle: 'Hisobingiz tekshirilmoqda, iltimos biroz kuting.',
      errorTitle: 'Google orqali kirish yakunlanmadi',
      conflictError: 'Bu akkauntga odatdagi usulda kiring',
      unverifiedError: 'Google hisobingizdagi emailni tasdiqlang',
      failedError: 'Google orqali kirish amalga oshmadi',
      missingCodeError: 'Google orqali kirish amalga oshmadi',
      expiredOrInvalidCodeError: 'Kirish muddati tugagan. Yangi Google kirishni boshlang.',
      unauthorizedProfileError: 'Sessiya tasdiqlanmadi. Iltimos, qayta kiring.',
      backToLogin: 'Kirish sahifasiga qaytish',
      startNewGoogleLogin: 'Yangi Google kirishni boshlash',
    },
    workspace: {
      menuStore: 'Do‘kon',
      menuMyOrders: 'Buyurtmalarim',
      menuCategories: 'Kategoriyalar',
      menuBrands: 'Brendlar',
      menuBranches: 'Filiallar',
      menuProducts: 'Mahsulotlar',
      menuAdminOrders: 'Buyurtmalar',
      menuTelegramRecipients: 'Telegram xabarnomalari',
      menuSiteLogo: 'Sayt logosi',
      menuSiteAbout: 'Biz haqimizda',
      menuAdminUsers: 'Foydalanuvchilar',
      menuAdminStatistics: 'Statistika',
      menuAdminAdvertisements: 'Reklamalar',
      header: {
        moreButton: 'Yana',
        moreMenuAriaLabel: 'Qo‘shimcha menyu bandlari',
        openMenuAriaLabel: 'Navigatsiya menyusini ochish',
        closeMenuAriaLabel: 'Navigatsiya menyusini yopish',
        homeAriaLabel: 'Oson Market bosh sahifasi',
        adminNavAriaLabel: 'Admin paneli bo‘limlari',
        adminSectionLabel: 'Admin bo‘limlari',
        languageSwitchAriaLabel: 'Tilni almashtirish',
      },
      menuProfile: 'Profilim',
      menuSecurity: 'Xavfsizlik',
      breadcrumbRoot: 'Oson Market',
      logoutButton: 'Chiqish',
      refreshProfile: 'Yangilash',
      retryButton: 'Qayta urinish',
      checkingProfile: 'Profil ma’lumotlari tekshirilmoqda...',
      profileTitle: 'Shaxsiy ma’lumotlar',
      profileSubtitle: 'Hisobingizning asosiy profil ma’lumotlari',
      notProvided: 'Kiritilmagan',
      fields: {
        email: 'Elektron pochta',
        username: 'Foydalanuvchi nomi',
        role: 'Hisob turi',
        language: 'Interfeys tili',
        firstName: 'Ism',
        lastName: 'Familiya',
        phone: 'Telefon raqam',
        emailVerified: 'Email holati',
        createdAt: 'Ro‘yxatdan o‘tgan sana',
        updatedAt: 'So‘nggi yangilanish',
      },
      roleNames: {
        USER: 'Xaridor',
        ADMIN: 'Administrator',
      },
      languageNames: {
        uz: 'O‘zbekcha',
        ru: 'Русский',
      },
      avatar: {
        uploadButton: 'Rasm yuklash',
        replaceButton: 'Rasmni almashtirish',
        deleteButton: 'O‘chirish',
        hint: 'PNG yoki JPEG, 2 MB va 2048×2048 px gacha',
        uploadedSuccess: 'Profil rasmi yangilandi.',
        deletedSuccess: 'Profil rasmi o‘chirildi.',
        alt: 'Profil rasmi',
      },
      personalForm: {
        title: 'Shaxsiy ma’lumotlarni tahrirlash',
        subtitle: 'Ism, familiya va aloqa telefon raqamingizni boshqaring',
        firstNamePlaceholder: 'Ismingizni kiriting',
        lastNamePlaceholder: 'Familiyangizni kiriting',
        phoneLabel: 'Telefon raqam',
        phonePlaceholder: '+998 90 123-45-67',
        phoneHelp: 'Raqam yoki + bilan boshlang (raqam, probel, qavs va defis)',
        clearNote: 'Maydonni bo‘sh qoldirsangiz, saqlangan qiymat tozalanadi.',
        saveButton: 'Ma’lumotlarni saqlash',
        resetButton: 'Bekor qilish',
        savedSuccess: 'Shaxsiy ma’lumotlar saqlandi.',
      },
      usernameForm: {
        title: 'Foydalanuvchi nomi',
        subtitle: 'Tizimga kirishda ishlatiladigan qisqa nomingiz',
        label: 'Yangi foydalanuvchi nomi',
        placeholder: 'yangi_user',
        help: '3–64 ta lotin harfi, raqam yoki pastki chiziq (_)',
        nextLoginNote: 'Keyingi kirishda yangi foydalanuvchi nomidan foydalanasiz.',
        saveButton: 'Nomni saqlash',
        savedSuccess: 'Foydalanuvchi nomi yangilandi.',
      },
      languageForm: {
        title: 'Interfeys va bildirishnoma tili',
        subtitle: 'Tanlangan til profilingizga saqlanadi',
        label: 'Asosiy til',
        saveButton: 'Tilni saqlash',
        savedSuccess: 'Til sozlamasi saqlandi.',
      },
      emailChange: {
        title: 'Elektron pochtani o‘zgartirish',
        subtitle: 'Yangi pochta manzilini joriy parol va tasdiqlash kodi orqali ulang',
        currentEmailLabel: 'Joriy elektron pochta',
        newEmailLabel: 'Yangi elektron pochta',
        newEmailPlaceholder: 'newbuyer@example.com',
        currentPasswordLabel: 'Joriy parol',
        currentPasswordPlaceholder: 'Joriy parolingizni kiriting',
        sendCodeButton: 'Tasdiqlash kodini yuborish',
        verifyHeading: 'Yangi pochtani tasdiqlang',
        verifySubtitle: 'Kod yuborilgan manzil',
        codeSentNotice: 'Joriy pochtangiz tasdiqlash yakunlanguncha faol bo‘lib qoladi.',
        verifyButton: 'Emailni tasdiqlash',
        cancelButton: 'Orqaga qaytish',
        reloginNote: 'Email yangilangandan so‘ng xavfsizlik uchun yangi email bilan qayta kirasiz.',
      },
      passwordChange: {
        title: 'Parolni o‘zgartirish',
        subtitle: 'Xavfsizlik uchun joriy parolingizni tasdiqlang va yangi parol o‘rnating',
        currentPasswordLabel: 'Joriy parol',
        currentPasswordPlaceholder: 'Joriy parolingizni kiriting',
        newPasswordLabel: 'Yangi parol',
        newPasswordPlaceholder: 'Kamida 8 ta belgi',
        confirmNewPasswordLabel: 'Yangi parolni tasdiqlang',
        confirmNewPasswordPlaceholder: 'Yangi parolni qayta kiriting',
        googleAccountNote:
          'Agar hisobingiz Google orqali yaratilgan bo‘lsa va hali parol o‘rnatilmagan bo‘lsa, hisobdan chiqib «Parolni unutdingizmi?» orqali parol yaratishingiz mumkin. Parol yangilangandan so‘ng qayta kirish talab etiladi.',
        saveButton: 'Parolni yangilash',
      },
      sessionCardTitle: 'Faol sessiya',
      sessionExpiresIn: 'Sessiya tugashiga qolgan vaqt',
      sessionPolicyNote:
        'Faol ishlayotganingizda kirish tokeni fonda avtomatik yangilanib boradi. Parol yoki email yangilanganda avvalgi sessiyalar yopiladi.',
      googleInfoTitle: 'Google bilan bog‘langan kirish',
      googleInfoBody:
        'Xohlasangiz, hisobingizga Google akkauntingiz orqali ham tez va xavfsiz kirishingiz mumkin.',
      verifiedStatus: 'Tasdiqlangan',
      unverifiedStatus: 'Tasdiqlanmagan',
      profileCompletion: {
        title: 'Profilingizni to‘ldiring',
        missingPrefix: 'Davom etish uchun ',
        missingSuffix: ' kiriting.',
        fieldLabels: {
          firstName: 'ismingizni',
          lastName: 'familiyangizni',
          phone: 'telefon raqamingizni',
        },
        phoneHelp: 'Xalqaro formatda kiriting (masalan: +998 90 123-45-67)',
        submitButton: 'Saqlash va xaridni boshlash',
        savedSuccess: 'Profilingiz saqlandi. Xush kelibsiz!',
      },
      storeHome: {
        welcomeTitle: 'Oson Market onlayn do‘koniga xush kelibsiz',
        welcomeSubtitle:
          'Profilingiz to‘liq tasdiqlandi. Buyurtmalar va qulay xaridlar uchun hisobingiz tayyor.',
        readyBannerTitle: 'Mahsulotlar katalogi tez orada shu sahifada ochiladi',
        readyBannerSubtitle:
          'Hozircha shaxsiy ma’lumotlaringiz, telefon raqamingiz va hisob xavfsizligini boshqarishingiz mumkin.',
        openProfileTitle: 'Profilim va aloqa ma’lumotlari',
        openProfileDesc: 'Ism, familiya, telefon raqam, rasm va til sozlamalarini tahrirlang.',
        openProfileAction: 'Profilni ochish',
        openSecurityTitle: 'Hisob xavfsizligi',
        openSecurityDesc: 'Elektron pochta, parol va faol kirish sessiyalarini boshqaring.',
        openSecurityAction: 'Xavfsizlik bo‘limi',
        openCategoriesTitle: 'Kategoriyalar boshqaruvi',
        openCategoriesDesc: 'Do‘kon kategoriyalarini qo‘shing, tahrirlang va faollik holatini boshqaring.',
        openCategoriesAction: 'Kategoriyalarni ochish',
        openBrandsTitle: 'Brendlar boshqaruvi',
        openBrandsDesc: 'Mahsulot brendlari, logotiplar va faol holatlarni boshqaring.',
        openBrandsAction: 'Brendlarni ochish',
        openProductsTitle: 'Mahsulotlar boshqaruvi',
        openProductsDesc: 'Mahsulotlar, variantlar (SKU) va galereya rasmlarini yagona oynada boshqaring.',
        openProductsAction: 'Mahsulotlarni ochish',
      },
    },
    adminCategories: {
      title: 'Kategoriyalar boshqaruvi',
      subtitle: 'Oson Market katalogi uchun o‘zbekcha va ruscha kategoriyalarni yarating hamda tartiblang',
      createButton: 'Kategoriya qo‘shish',
      refreshButton: 'Yangilash',
      totalCountLabel: 'Jami',
      rootCategory: 'Asosiy kategoriya',
      missingTranslation: 'Tarjima kiritilmagan',
      activeLabel: 'Faol',
      inactiveLabel: 'Nofaol',
      incompleteToggleNotice:
        'Faol holatni saqlash uchun avval o‘zbekcha va ruscha nomlarni to‘ldiring.',
      checkingPermissions: 'Admin ruxsatlari tekshirilmoqda...',
      forbiddenTitle: 'Ruxsat cheklangan',
      forbiddenSubtitle: 'Kategoriyalarni boshqarish uchun admin ruxsati kerak.',
      userRoleBlockedTitle: 'ADMIN akkaunti bilan kirish kerak',
      userRoleBlockedSubtitle:
        'Kategoriyalarni boshqarish faqat administratorlar uchun ochiq. Joriy hisobingiz roli: USER.',
      switchAccountButton: 'ADMIN akkauntiga kirish',
      backendForbiddenTitle: 'Backend ruxsatni rad etdi (403)',
      backendForbiddenSubtitle:
        'Profilingiz ADMIN rolini qaytargan bo‘lsa ham, backend ushbu endpoint uchun 403 ruxsat xatosini berdi.',
      backendForbiddenEndpointLabel: 'Rad etilgan endpoint',
      emptyTitle: 'Hozircha kategoriyalar yo‘q',
      emptyDescription: 'Do‘kon katalogini tuzish uchun birinchi kategoriyani yarating.',
      sortOrderShortLabel: 'Tartib',
      backToStore: 'Do‘konga qaytish',
      notFoundError: 'Kategoriya topilmadi yoki o‘chirilgan.',
      columns: {
        uzName: 'O‘zbekcha nomi',
        ruName: 'Ruscha nomi',
        slug: 'Slug',
        parent: 'Ota kategoriya',
        sortOrder: 'Tartib',
        status: 'Holati',
        actions: 'Amallar',
      },
      actions: {
        edit: 'Tahrirlash',
        delete: 'O‘chirish',
        viewProducts: 'Mahsulotlar',
        addProduct: 'Mahsulot qo‘shish',
        deleteConfirmTitle: 'Kategoriyani o‘chirasizmi?',
        deleteConfirmDescription:
          'Agar unga ichki kategoriya yoki mahsulot bog‘langan bo‘lsa, o‘chirish amalga oshmaydi.',
        deleteConfirmOk: 'Ha, o‘chirish',
        deleteConfirmCancel: 'Bekor qilish',
      },
      form: {
        createTitle: 'Yangi kategoriya qo‘shish',
        editTitle: 'Kategoriyani tahrirlash',
        loadingCategory: 'Kategoriya ma’lumotlari yuklanmoqda...',
        generalSection: 'Asosiy sozlamalar',
        slugLabel: 'Slug',
        slugPlaceholder: 'telefonlar',
        slugGenerate: 'Nomdan yaratish',
        parentLabel: 'Ota kategoriya',
        parentPlaceholder: 'Asosiy kategoriya (ota kategoriyasiz)',
        sortOrderLabel: 'Tartib raqami',
        imageLabel: 'Kategoriya rasmi (ixtiyoriy)',
        selectImageButton: 'Rasm tanlash',
        replaceImageButton: 'Almashtirish',
        removeImageButton: 'Olib tashlash',
        imageHint: 'PNG yoki JPEG, 2 MB va 2048×2048 px gacha',
        imageAlt: 'Kategoriya rasmi',
        activeLabel: 'Faol kategoriya',
        uzSection: 'O‘zbekcha ma’lumotlar',
        ruSection: 'Ruscha ma’lumotlar',
        nameLabel: 'Nomi',
        namePlaceholderUz: 'Telefonlar',
        namePlaceholderRu: 'Телефоны',
        descriptionLabel: 'Tavsif',
        descriptionPlaceholder: 'Qisqacha kategoriya tavsifi (ixtiyoriy)',
        seoTitleLabel: 'SEO sarlavha',
        seoTitlePlaceholder: 'SEO sarlavha (ixtiyoriy)',
        seoDescriptionLabel: 'SEO tavsif',
        seoDescriptionPlaceholder: 'SEO tavsif (ixtiyoriy)',
        saveCreate: 'Kategoriya yaratish',
        saveUpdate: 'O‘zgarishlarni saqlash',
        cancel: 'Bekor qilish',
      },
      validation: {
        requiredSlug: 'Slug qiymatini kiriting',
        slugMaxLength: 'Slug 160 ta belgidan oshmasligi kerak',
        requiredName: 'Kategoriya nomini kiriting',
        nameMaxLength: 'Kategoriya nomi 200 ta belgidan oshmasligi kerak',
        seoTitleMaxLength: 'SEO sarlavha 255 ta belgidan oshmasligi kerak',
        invalidUuid: 'To‘g‘ri tanlovni kiriting',
        sortOrderMin: 'Tartib raqami 0 yoki undan katta bo‘lishi kerak',
        imageInvalidType: 'Faqat PNG yoki JPEG formatidagi rasmni tanlang',
        imageTooLarge: 'Rasm hajmi 2 MB dan oshmasligi kerak',
        imageInvalidDimensions: 'Rasm o‘lchami 2048×2048 pikseldan oshmasligi kerak',
        imageReadError: 'Tanlangan rasm faylini ochib bo‘lmadi',
      },
      notifications: {
        createdSuccess: 'Kategoriya muvaffaqiyatli yaratildi.',
        updatedSuccess: 'Kategoriya yangilandi.',
        statusUpdatedSuccess: 'Kategoriya holati yangilandi.',
        deletedSuccess: 'Kategoriya o‘chirildi.',
      },
    },
    adminProducts: {
      title: 'Mahsulotlar boshqaruvi',
      subtitle: 'Kategoriya va brendlar bo‘yicha mahsulotlar, variantlar hamda rasmlarni boshqaring',
      createButton: 'Mahsulot qo‘shish',
      refreshButton: 'Yangilash',
      totalCountLabel: 'Jami',
      filterByCategoryLabel: 'Kategoriya bo‘yicha filtr',
      allCategoriesOption: 'Barcha kategoriyalar',
      noCategory: 'Kategoriyasiz',
      noBrand: 'Brendsiz',
      checkingPermissions: 'Admin ruxsatlari tekshirilmoqda...',
      userRoleBlockedTitle: 'ADMIN akkaunti bilan kirish kerak',
      userRoleBlockedSubtitle:
        'Mahsulotlarni boshqarish faqat administratorlar uchun ochiq. Joriy hisobingiz roli: USER.',
      switchAccountButton: 'ADMIN akkauntiga kirish',
      backendForbiddenTitle: 'Backend ruxsatni rad etdi (403)',
      backendForbiddenSubtitle:
        'Profilingiz ADMIN rolini qaytargan bo‘lsa ham, backend ushbu endpoint uchun 403 ruxsat xatosini berdi.',
      backendForbiddenEndpointLabel: 'Rad etilgan endpoint',
      emptyTitle: 'Hozircha mahsulotlar yo‘q',
      emptyDescription: 'Katalogga birinchi mahsulot va uning variantlarini qo‘shing.',
      emptyFilteredDescription: 'Tanlangan kategoriya bo‘yicha mahsulot topilmadi.',
      backToStore: 'Do‘konga qaytish',
      notFoundError: 'Mahsulot topilmadi yoki o‘chirilgan.',
      warrantyMonthsSuffix: 'oy',
      statusNames: {
        DRAFT: 'Qoralama',
        ACTIVE: 'Faol',
        ARCHIVED: 'Arxivlangan',
      },
      variantStatusNames: {
        ACTIVE: 'Faol',
        INACTIVE: 'Nofaol',
        DRAFT: 'Qoralama',
      },
      columns: {
        productName: 'Mahsulot nomi',
        slug: 'Slug',
        brand: 'Brend',
        categories: 'Kategoriyalar',
        productKind: 'Turi',
        warranty: 'Kafolat',
        status: 'Holati',
        actions: 'Amallar',
      },
      actions: {
        viewDetails: 'Batafsil',
        edit: 'Tahrirlash',
        delete: 'O‘chirish',
        deleteConfirmTitle: 'Mahsulotni o‘chirasizmi?',
        deleteConfirmDescription:
          'Agar mahsulot buyurtma yoki ombor yozuvlariga bog‘langan bo‘lsa, o‘chirish amalga oshmaydi.',
        deleteConfirmOk: 'Ha, o‘chirish',
        deleteConfirmCancel: 'Bekor qilish',
      },
      form: {
        createTitle: 'Yangi mahsulot qo‘shish',
        editTitle: 'Mahsulotni tahrirlash',
        loadingProduct: 'Mahsulot va variantlar ma’lumotlari yuklanmoqda...',
        productSection: 'Mahsulot ma’lumotlari',
        slugLabel: 'Slug',
        slugPlaceholder: 'iphone-15-pro',
        slugGenerate: 'Nomdan yaratish',
        brandLabel: 'Brend',
        brandPlaceholder: 'Brendni tanlang (ixtiyoriy)',
        categoriesLabel: 'Kategoriyalar',
        categoriesPlaceholder: 'Bir yoki bir nechta kategoriyani tanlang',
        statusLabel: 'Holati',
        productKindLabel: 'Mahsulot turi',
        productKindPlaceholder: 'Masalan: PHYSICAL (ixtiyoriy)',
        warrantyMonthsLabel: 'Kafolat (oy)',
        warrantyMonthsPlaceholder: '12',
        uzSection: 'O‘zbekcha matnlar (UZ)',
        ruSection: 'Ruscha matnlar (RU)',
        titleLabel: 'Sarlavha (Nomi)',
        titlePlaceholderUz: 'Apple iPhone 15 Pro',
        titlePlaceholderRu: 'Apple iPhone 15 Pro',
        shortDescriptionLabel: 'Qisqa tavsif',
        shortDescriptionPlaceholder: 'Qisqacha mahsulot tavsifi (ixtiyoriy)',
        descriptionLabel: 'To‘liq tavsif',
        descriptionPlaceholder: 'Batafsil tavsif (ixtiyoriy)',
        seoTitleLabel: 'SEO sarlavha',
        seoTitlePlaceholder: 'SEO sarlavha (ixtiyoriy)',
        seoDescriptionLabel: 'SEO tavsif',
        seoDescriptionPlaceholder: 'SEO tavsif (ixtiyoriy)',
        variantsSection: 'Variantlar',
        variantsLimitHint: 'Kamida 1 ta, ko‘pi bilan 100 ta variant',
        addVariantButton: 'Variant qo‘shish',
        variantCardTitle: 'Variant',
        removeVariantButton: 'Variantni o‘chirish',
        skuLabel: 'SKU',
        skuPlaceholder: 'IP15P-256-BLK',
        barcodeLabel: 'Shtrix-kod (Barcode)',
        barcodePlaceholder: '460000000001',
        variantStatusLabel: 'Variant holati',
        variantStatusPlaceholder: 'Holatni tanlang',
        defaultTypeLabel: 'Asosiy variant',
        defaultTypeActive: 'Asosiy variant',
        defaultTypeMakeDefault: 'Asosiy qilish',
        regularPriceLabel: 'Odatiy narx (UZS)',
        regularPricePlaceholder: '150000',
        salePriceLabel: 'Chegirmali narx (UZS, ixtiyoriy)',
        salePricePlaceholder: '129000',
        priceSectionHint: 'Narx musbat va ko‘pi bilan 2 xona kasr qismiga ega bo‘lishi kerak',
        dimensionsOptionalTitle: 'O‘lcham va og‘irlik (ixtiyoriy)',
        weightGramsLabel: 'Og‘irligi (g)',
        lengthMmLabel: 'Uzunligi (mm)',
        widthMmLabel: 'Kengligi (mm)',
        heightMmLabel: 'Balandligi (mm)',
        imagesSectionLabel: 'Variant rasmlari',
        selectImagesButton: 'Rasmlar tanlash',
        imagesHint: 'PNG/JPEG, 2 MB va 2048×2048 px gacha · variantda max 20 ta · bitta saqlashda max 12 ta yangi fayl',
        noImagesYet: 'Hozircha rasm tanlanmagan',
        replaceImageButton: 'Almashtirish',
        removeImageButton: 'Olib tashlash',
        moveImageUp: 'Oldinga',
        moveImageDown: 'Orqaga',
        primaryImageLabel: 'Asosiy rasm',
        setPrimaryImageButton: 'Asosiy qilish',
        sortOrderLabel: 'Tartib',
        imageAlt: 'Variant rasmi',
        saveCreate: 'Saqlash',
        saveUpdate: 'Saqlash',
        cancel: 'Bekor qilish',
      },
      validation: {
        requiredSlug: 'Mahsulot slug qiymatini kiriting',
        slugMaxLength: 'Slug 160 ta belgidan oshmasligi kerak',
        requiredCategories: 'Kamida bitta kategoriya tanlang',
        variantsRequired: 'Kamida bitta mahsulot varianti bo‘lishi kerak',
        variantsMaxLimit: 'Bitta mahsulotda ko‘pi bilan 100 ta variant bo‘lishi mumkin',
        requiredSku: 'Variant SKU kodini kiriting',
        skuMaxLength: 'SKU 120 ta belgidan oshmasligi kerak',
        titleRequiredAnyLang: 'Kamida bitta tilda (UZ yoki RU) mahsulot nomini kiriting',
        pricePositive: 'Narx 0 dan katta musbat son bo‘lishi kerak',
        priceDecimals: 'Kasr qismi ko‘pi bilan ikki xonagacha ruxsat etiladi',
        regularRequiredForSale: 'Chegirmali narx kiritish uchun avval odatiy narxni kiriting',
        saleLessThanRegular: 'Chegirmali narx odatiy narxdan kichik bo‘lishi kerak',
        warrantyInvalid: 'Kafolat muddati 0 yoki undan katta butun son bo‘lishi kerak',
        nonNegativeInteger: '0 yoki undan katta butun son kiriting',
        imagesPerVariantLimit: 'Bitta variantga ko‘pi bilan 20 ta rasm biriktirish mumkin',
        uploadFilesTotalLimit: 'Bitta saqlashda ko‘pi bilan 12 ta yangi yoki almashtirilgan rasm yuborish mumkin',
        imageInvalidType: 'Faqat PNG yoki JPEG formatidagi rasmlarni tanlang',
        imageTooLarge: 'Har bir rasm hajmi 2 MB dan oshmasligi kerak',
        imageInvalidDimensions: 'Rasm o‘lchami 2048×2048 pikseldan oshmasligi kerak',
        imageReadError: 'Tanlangan rasm faylini o‘qib bo‘lmadi',
        conflictError: 'Slug yoki SKU allaqachon band, yoxud yozuv boshqa ma’lumotlar bilan bog‘langan.',
        payloadTooLargeError: 'Yuborilgan fayllar hajmi limitdan oshdi. Rasmlarni kamaytirib qayta urinib ko‘ring.',
        unsupportedMediaError: 'So‘rov formati noto‘g‘ri (multipart/form-data va product JSON talab qilinadi).',
      },
      notifications: {
        createdSuccess: 'Mahsulot muvaffaqiyatli yaratildi.',
        updatedSuccess: 'Mahsulot va variantlar saqlandi.',
        deletedSuccess: 'Mahsulot o‘chirildi.',
      },
      detail: {
        backToList: 'Mahsulotlarga qaytish',
        editProductButton: 'Mahsulotni tahrirlash',
        loadingTitle: 'Mahsulot tafsilotlari yuklanmoqda...',
        metadataTitle: 'Asosiy ma’lumotlar va sanalar',
        createdAtLabel: 'Yaratilgan',
        updatedAtLabel: 'Yangilangan',
        publishedAtLabel: 'Chop etilgan',
        uzContentTitle: 'O‘zbekcha kontent (UZ)',
        ruContentTitle: 'Ruscha kontent (RU)',
        titleLabel: 'Nomi',
        shortDescriptionLabel: 'Qisqa tavsif',
        descriptionLabel: 'To‘liq tavsif',
        seoTitleLabel: 'SEO sarlavha',
        seoDescriptionLabel: 'SEO tavsif',
        emptyField: '—',
        missingTranslationNotice: 'Ushbu til uchun ma’lumotlar kiritilmagan',
        variantsTitle: 'Mahsulot variantlari',
        variantsCountLabel: 'Variantlar soni',
        emptyVariantsTitle: 'Hozircha variantlar qolmagan',
        emptyVariantsSubtitle:
          'Mahsulotda hozir birorta variant yo‘q. Keyingi saqlash uchun yangi variant qo‘shing.',
        addNewVariantButton: 'Yangi variant qo‘shish',
        barcodeLabel: 'Shtrix-kod',
        variantStatusLabel: 'Holati',
        defaultVariantBadge: 'Asosiy variant',
        priceLabel: 'Narxi',
        regularPriceLabel: 'Odatiy narxi',
        salePriceLabel: 'Chegirmali narxi',
        noPrice: 'Narx kiritilmagan',
        weightLabel: 'Og‘irligi',
        dimensionsLabel: 'O‘lchamlari (U × K × B)',
        noDimensions: 'Kiritilmagan',
        galleryTitle: 'Rasm galereyasi',
        noImages: 'Ushbu variant uchun rasmlar yuklanmagan',
        primaryImageBadge: 'Asosiy rasm',
        sortOrderLabel: 'Tartib',
        editVariantButton: 'Tahrirlash',
        deleteVariantButton: 'O‘chirish',
        deleteVariantConfirmTitle: 'Variantni o‘chirasizmi?',
        deleteVariantConfirmDescription:
          'Variant o‘chirilganda unga biriktirilgan rasmlar ham mahsulotdan uziladi.',
        editImageButton: 'Tahrirlash',
        deleteImageButton: 'O‘chirish',
        deleteImageConfirmTitle: 'Rasmni o‘chirasizmi?',
        deleteImageConfirmDescription: 'Ushbu rasm mahsulot variantidan olib tashlanadi.',
        deleteConfirmOk: 'Ha, o‘chirish',
        deleteConfirmCancel: 'Bekor qilish',
        variantDeletedSuccess: 'Variant muvaffaqiyatli o‘chirildi.',
        imageDeletedSuccess: 'Rasm muvaffaqiyatli o‘chirildi.',
      },
    },
    adminBrands: {
      title: 'Brendlar boshqaruvi',
      subtitle: 'Oson Market katalogi uchun brendlar, logotiplar va faollik holatini boshqaring',
      createButton: 'Brend qo‘shish',
      refreshButton: 'Yangilash',
      totalCountLabel: 'Jami',
      searchPlaceholder: 'Nom yoki slug bo‘yicha qidirish...',
      statusFilterLabel: 'Holat',
      statusFilterAll: 'Barchasi',
      statusFilterActive: 'Faol',
      statusFilterInactive: 'Nofaol',
      clearFilters: 'Filtrlarni tozalash',
      activeLabel: 'Faol',
      inactiveLabel: 'Nofaol',
      checkingPermissions: 'Admin ruxsatlari tekshirilmoqda...',
      userRoleBlockedTitle: 'ADMIN akkaunti bilan kirish kerak',
      userRoleBlockedSubtitle:
        'Brendlarni boshqarish faqat administratorlar uchun ochiq. Joriy hisobingiz roli: USER.',
      switchAccountButton: 'ADMIN akkauntiga kirish',
      backendForbiddenTitle: 'Backend ruxsatni rad etdi (403)',
      backendForbiddenSubtitle:
        'Profilingiz ADMIN rolini qaytargan bo‘lsa ham, backend ushbu endpoint uchun 403 ruxsat xatosini berdi.',
      backendForbiddenEndpointLabel: 'Rad etilgan endpoint',
      emptyTitle: 'Hozircha brendlar yo‘q',
      emptyDescription: 'Mahsulotlarga biriktirish uchun birinchi brendni qo‘shing.',
      emptyFilteredDescription: 'Qidiruv yoki holat filtriga mos brendlar topilmadi.',
      backToStore: 'Do‘konga qaytish',
      notFoundError: 'Brend topilmadi yoki o‘chirilgan.',
      columns: {
        brand: 'Brend',
        slug: 'Slug',
        status: 'Holati',
        actions: 'Amallar',
      },
      actions: {
        view: 'Batafsil',
        edit: 'Tahrirlash',
        delete: 'O‘chirish',
        deleteConfirmTitle: 'Brendni o‘chirasizmi?',
        deleteConfirmDescription:
          'Agar ushbu brendga mahsulotlar bog‘langan bo‘lsa, o‘chirish amalga oshmaydi.',
        deleteConfirmOk: 'Ha, o‘chirish',
        deleteConfirmCancel: 'Bekor qilish',
      },
      messages: {
        createdSuccess: 'Brend muvaffaqiyatli yaratildi.',
        updatedSuccess: 'Brend ma’lumotlari yangilandi.',
        deletedSuccess: 'Brend o‘chirildi.',
        statusUpdatedSuccess: 'Brend holati yangilandi.',
      },
      form: {
        createTitle: 'Yangi brend qo‘shish',
        editTitle: 'Brendni tahrirlash',
        nameLabel: 'Brend nomi',
        namePlaceholder: 'Masalan: Samsung',
        slugLabel: 'Slug',
        slugPlaceholder: 'samsung',
        generateSlugButton: 'Nomdan yaratish',
        slugHelp: 'Lotin harflari, raqamlar va defis (-)',
        activeLabel: 'Holati',
        activeHint: 'Faol brendlar katalogda tanlash uchun ko‘rinadi',
        logoLabel: 'Brend logotipi (ixtiyoriy)',
        logoPickButton: 'Logotip tanlash',
        logoReplaceButton: 'Almashtirish',
        logoRemoveButton: 'Olib tashlash',
        logoHint: 'PNG yoki JPEG, maksimal 2 MB va 2048×2048 px',
        logoPreviewAlt: 'Brend logotipi',
        logoEmptyText: 'Logotip yuklanmagan',
        saveButton: 'Saqlash',
        cancelButton: 'Bekor qilish',
      },
      detail: {
        title: 'Brend tafsilotlari',
        nameLabel: 'Brend nomi',
        slugLabel: 'Slug',
        statusLabel: 'Faollik holati',
        logoLabel: 'Logotip',
        noLogo: 'Logotip biriktirilmagan',
        editButton: 'Tahrirlash',
        deleteButton: 'O‘chirish',
      },
      validation: {
        nameRequired: 'Brend nomini kiriting',
        nameTooLong: 'Brend nomi ko‘pi bilan 180 ta belgidan iborat bo‘lishi kerak',
        slugRequired: 'Slug kiriting',
        slugTooLong: 'Slug ko‘pi bilan 120 ta belgidan iborat bo‘lishi kerak',
        logoInvalidType: 'Faqat PNG yoki JPEG rasm yuklash mumkin',
        logoTooLarge: 'Logotip hajmi 2 MB dan oshmasligi kerak',
        logoInvalidDimensions: 'Rasm o‘lchami 2048×2048 px dan oshmasligi kerak',
        logoReadError: 'Tanlangan rasmni o‘qib bo‘lmadi',
      },
    },
    catalog: {
      navCatalog: 'Mahsulotlar',
      navBranches: 'Filiallar',
      navAbout: 'Biz haqimizda',
      navSignIn: 'Kirish',
      heroHeading: 'Oson Market mahsulotlari',
      heroSubtitle:
        'Kategoriyalar bo‘yicha qidiring, texnik xususiyatlar va variantlarni solishtiring hamda kerakli mahsulotni tanlang.',
      searchPlaceholder: 'Mahsulot nomi, brend yoki SKU bo‘yicha qidirish...',
      allCategories: 'Barcha mahsulotlar',
      uncategorizedLabel: 'Kategoriyasiz mahsulotlar',
      subcategoriesLabel: 'Ichki kategoriyalar',
      productsCountSuffix: 'ta mahsulot',
      categoriesCountSuffix: 'ta kategoriya',
      viewProduct: 'Batafsil',
      noImageLabel: 'Rasm mavjud emas',
      variantCountSingle: 'variant',
      variantCountPlural: 'variant',
      skuPrefix: 'SKU',
      warrantyPrefix: 'Kafolat',
      warrantyMonthsSuffix: 'oy',
      emptyTitle: 'Katalogda hozircha mahsulotlar yo‘q',
      emptyDescription: 'Yangi mahsulotlar tez orada katalogga qo‘shiladi.',
      emptyFilteredTitle: 'Mos mahsulot topilmadi',
      emptyFilteredDescription:
        'Tanlangan kategoriya yoki qidiruv so‘rovi bo‘yicha mahsulotlar topilmadi.',
      clearFilters: 'Filtrlarni tozalash',
      retryButton: 'Qayta urinish',
      loadingLabel: 'Katalog yuklanmoqda...',
      productNotFoundTitle: 'Mahsulot topilmadi',
      productNotFoundSubtitle:
        'So‘ralgan mahsulot katalogda mavjud emas yoki nashrdan olingan.',
      backToCatalog: 'Mahsulotlarga qaytish',
      brandLabel: 'Brend',
      categoryLabel: 'Kategoriya',
      productKindLabel: 'Mahsulot turi',
      warrantyLabel: 'Kafolat muddati',
      variantsTitle: 'Variantni tanlang',
      defaultVariantLabel: 'Asosiy',
      selectedSkuLabel: 'Tanlangan SKU',
      specificationsTitle: 'O‘lcham va og‘irlik',
      weightLabel: 'Og‘irligi',
      weightUnit: 'g',
      dimensionsLabel: 'O‘lchamlari (U × K × B)',
      lengthLabel: 'Uzunligi',
      widthLabel: 'Kengligi',
      heightLabel: 'Balandligi',
      mmUnit: 'mm',
      descriptionTitle: 'Mahsulot haqida',
      orderButton: 'Buyurtma berish',
      guestOrderHint: 'Buyurtma berishni davom ettirish uchun hisobingizga kiring.',
      signedInOrderNoticeTitle: 'Buyurtma berish oqimi hali ulanmagan',
      signedInOrderNoticeBody:
        'Sizning mahsulot va variant tanlovingiz tayyor, ammo hozirgi katalog API hali onlayn buyurtma yaratishni qo‘llab-quvvatlamaydi.',
      postLoginOrderNoticeTitle: 'Hisobga muvaffaqiyatli kirdingiz',
      postLoginOrderNoticeBody:
        'Tanlangan mahsulot va variant saqlandi. Hozirgi katalog API hali buyurtma yaratishni qo‘llab-quvvatlamaydi, shu sababli buyurtma yuborilmadi.',
      selectedSummaryLabel: 'Tanlangan mahsulot va variant',
      completeProfileLink: 'Profil ma’lumotlarini to‘ldirish',
      noPriceLabel: 'Narx kiritilmagan',
      addToCart: 'Savatga qo‘shish',
      cartButtonLabel: 'Savat',
      cartTitle: 'Savat',
      cartEmptyTitle: 'Savatingiz bo‘sh',
      cartEmptyDescription: 'Katalogdan kerakli mahsulotlarni tanlab savatga qo‘shing.',
      cartClearButton: 'Savatni tozalash',
      cartRemoveItem: 'O‘chirish',
      cartUnitPrice: 'Dona narxi',
      cartLineTotal: 'Jami',
      cartTotalLabel: 'Umumiy summa',
      cartItemsCountSuffix: 'dona',
      cartOrderButton: 'Buyurtma berish',
      cartOrderUnavailableTitle: 'Buyurtma yuborilmadi — API ulanmagan',
      cartOrderUnavailableBody:
        'Savatdagi mahsulotlaringiz saqlangan, ammo hozirgi backendda buyurtma yaratish API’si hali mavjud emas.',
      cartPostLoginTitle: 'Hisobga muvaffaqiyatli kirdingiz',
      cartPostLoginBody:
        'Savatdagi mahsulotlaringiz saqlandi. Hozirgi backendda buyurtma yaratish API’si mavjud emasligi sababli buyurtma yuborilmadi.',
      cartNoPriceBlocked: 'Narxi kiritilmagan mahsulotni xarid qilib bo‘lmaydi.',
      decreaseQuantityLabel: 'Sonini kamaytirish',
      increaseQuantityLabel: 'Sonini oshirish',
      shareButton: 'Ulashish',
      shareAriaLabel: 'Mahsulot havolasini ulashish',
      shareCopiedSuccess: 'Havola nusxalandi',
      shareFallbackTitle: 'Havolani nusxalash',
      shareFallbackDescription:
        'Brauzer avtomatik nusxalashga ruxsat bermadi. Quyidagi to‘liq havolani belgilab qo‘lda nusxalang.',
      shareFallbackSelectButton: 'Havolani belgilash',
      shareFallbackClose: 'Yopish',
      allCategoriesButton: 'Barcha kategoriyalar',
      allCategoriesModalTitle: 'Barcha kategoriyalar',
      chooseVariantButton: 'Variant tanlash',
      selectVariantModalTitle: 'Variantni tanlang',
      inCartLabel: 'Savatda',
      prevImageAriaLabel: 'Oldingi rasm',
      nextImageAriaLabel: 'Keyingi rasm',
      closeButton: 'Yopish',
    },
    guestAuth: {
      modalTitle: 'Buyurtma uchun tizimga kiring',
      modalSubtitle: 'Kirish tugagach, tanlangan mahsulot va savat holati saqlanib qoladi.',
      selectedItemLabel: 'Saqlangan tanlov',
      cartSummaryLabel: 'Savatdagi mahsulotlar',
      cartItemsUnit: 'dona',
      signInTab: 'Kirish',
      signUpTab: 'Ro‘yxatdan o‘tish',
      cancelButton: 'Bekor qilish',
    },
    productSocial: {
      sectionTitle: 'Izohlar',
      likeProductLabel: 'Mahsulotga layk bosish',
      unlikeProductLabel: 'Mahsulot laykini olib tashlash',
      likeCommentLabel: 'Izohga layk bosish',
      unlikeCommentLabel: 'Izoh laykini olib tashlash',
      commentsCountSuffix: 'ta izoh',
      commentPlaceholder: 'Mahsulot haqida fikringiz yoki savolingizni yozing...',
      commentSubmitButton: 'Izoh qoldirish',
      guestCommentHint: 'Izoh yozish, javob berish yoki layk bosish uchun hisobingizga kiring.',
      guestLoginPromptButton: 'Kirish',
      replyButton: 'Javob berish',
      replyingToLabel: 'Javob yozilmoqda',
      replyPlaceholder: 'Javob matnini kiriting...',
      replySubmitButton: 'Javob yuborish',
      cancelButton: 'Bekor qilish',
      viewRepliesButton: 'Javoblarni ko‘rish',
      hideRepliesButton: 'Javoblarni yashirish',
      loadingComments: 'Izohlar yuklanmoqda...',
      loadingReplies: 'Javoblar yuklanmoqda...',
      loadMoreComments: 'Yana izohlarni yuklash',
      loadMoreReplies: 'Yana javoblarni yuklash',
      emptyTitle: 'Hozircha izohlar yo‘q',
      emptyDescription: 'Ushbu mahsulot haqida birinchi bo‘lib fikr qoldiring.',
      editedLabel: 'tahrirlangan',
      deletedPlaceholder: 'Izoh o‘chirilgan',
      editButton: 'Tahrirlash',
      saveEditButton: 'Saqlash',
      deleteButton: 'O‘chirish',
      deleteConfirmTitle: 'Izohni o‘chirasizmi?',
      deleteConfirmDescription: 'O‘chirilgan izohni tiklab bo‘lmaydi.',
      deleteConfirmOk: 'Ha, o‘chirish',
      deleteConfirmCancel: 'Bekor qilish',
      validationRequired: 'Izoh matnini kiriting.',
      validationMaxLength: 'Izoh matni 2000 ta belgidan oshmasligi kerak.',
      commentCreatedSuccess: 'Izohingiz qo‘shildi.',
      replyCreatedSuccess: 'Javobingiz yuborildi.',
      commentUpdatedSuccess: 'Izoh yangilandi.',
      commentDeletedSuccess: 'Izoh o‘chirildi.',
      sessionRestoredNotice: 'Akkauntga kirdingiz — endi amalingizni yakunlashingiz mumkin.',
      ownCommentBadge: 'Siz',
      ownCommentAriaLabel: 'Sizning izohingiz',
      authorAvatarAltPrefix: 'Profil rasmi',
    },
    orders: {
      checkoutSectionTitle: 'Buyurtmani rasmiylashtirish',
      checkoutSectionSubtitle:
        'Aloqa ma’lumotlari va yetkazib berish yoki olib ketish usulini tanlang. Yakuniy summani backend hisoblaydi.',
      phoneLabel: 'Telefon raqami',
      phonePlaceholder: '+998901234567',
      phoneHint:
        'Faqat ushbu buyurtma uchun aloqa raqami (+, probel, qavs, defis ruxsat etiladi; 7–15 ta raqam).',
      telegramLabel: 'Telegram manzili',
      telegramPlaceholder: '@oson_xaridor yoki https://t.me/oson_xaridor',
      telegramHint:
        'Aloqa uchun @username yoki https://t.me/username kiriting (xabar yuborish chat ID emas).',
      fulfillmentTitle: 'Qabul qilish usuli',
      fulfillmentMethods: {
        PICKUP: 'Filialdan olib ketish',
        DELIVERY: 'Kuryer orqali yetkazish',
      },
      pickupMethodHint: 'Tanlangan filialdan bepul olib ketish',
      deliveryMethodHint: 'Manzil va lokatsiya asosida kuryer yetkazib beradi',
      selectBranchLabel: 'Filialni tanlang',
      loadingBranches: 'Filiallar yuklanmoqda...',
      noBranchesForMethod: 'Ushbu usul uchun faol filiallar hozircha mavjud emas.',
      branchesLoadError: 'Filiallarni yuklab bo‘lmadi.',
      deliveryAddressLabel: 'Yetkazib berish manzili',
      deliveryAddressPlaceholder: 'Ko‘cha, uy, xonadon yoki mo‘ljal',
      selectedAddressLabel: 'Tanlangan manzil',
      resolvingAddressLabel: 'Manzil aniqlanmoqda...',
      approximateAddressBadge: 'Taxminiy manzil',
      approximateAddressHint:
        'Uy raqami topilmadi — ko‘cha va hudud bo‘yicha taxminiy manzil ko‘rsatildi.',
      geocodeFallbackNote:
        'Aniq ko‘cha manzilini olib bo‘lmadi — tanlangan xarita nuqtasi yuboriladi.',
      selectPointPrompt:
        'Manzil avtomatik to‘ldirilishi uchun «Joylashuvimni olish» tugmasini bosing yoki xaritadan nuqta tanlang.',
      addressNoteLabel: 'Xonadon, kirish yo‘lagi yoki mo‘ljal (ixtiyoriy)',
      addressNotePlaceholder: 'Masalan: 12-xonadon, 2-kirish yo‘lagi, domofon 12',
      distanceUnavailable: 'Masofa mavjud emas',
      nearestSortedHint: 'Tanlangan nuqtaga eng yaqin filiallar yuqorida ko‘rsatildi',
      locationLabel: 'Lokatsiya nuqtasi',
      getLocationButton: 'Joylashuvimni olish',
      gettingLocationLabel: 'Joylashuv aniqlanmoqda...',
      locationPermissionDeniedHint:
        'Joylashuv ruxsati berilmadi. Xaritadan nuqta tanlang yoki koordinatalarni qo‘lda kiriting.',
      locationUnsupportedHint:
        'Brauzer geolokatsiyani qo‘llamaydi. Xaritadan nuqta tanlang yoki koordinatalarni kiriting.',
      locationFoundHint: 'Joylashuv aniqlandi. Kerak bo‘lsa xaritada nuqtani siljitishingiz mumkin.',
      latitudeLabel: 'Kenglik (latitude)',
      longitudeLabel: 'Uzunlik (longitude)',
      mapPickHint: 'Yetkazish nuqtasini tanlash uchun xaritaga bosing yoki belgini suring.',
      deliveryQuoteLoading: 'Yetkazish narxi hisoblanmoqda...',
      deliveryQuoteError: 'Yetkazish narxini hisoblab bo‘lmadi.',
      distanceLabel: 'Masofa',
      ratePerKmLabel: 'Kilometr tarifi',
      deliveryFeeLabel: 'Yetkazish summasi',
      straightLineHint: 'Masofa to‘g‘ri chiziq bo‘yicha (STRAIGHT_LINE) hisoblanadi',
      estimatedTotalLabel: 'Taxminiy jami',
      serverFinalTotalNote: 'Yakuniy summa server tasdig‘idan so‘ng grandTotal da qayd etiladi',
      submitOrderButton: 'Buyurtmani tasdiqlash',
      editCartButton: 'Savatga qaytish',
      itemsLimitError: 'Bitta buyurtmada ko‘pi bilan 50 ta turli variant bo‘lishi mumkin.',
      itemQuantityLimitError: 'Har bir variant miqdori 1 dan 99 donagacha bo‘lishi kerak.',
      networkRetryHint:
        'Tarmoq xatoligi yuz berdi. Aynan shu ma’lumotlar bilan qayta urinib ko‘rishingiz mumkin — takroriy buyurtma yaratilmaydi.',
      priceChangedNotice:
        'Mahsulot holati yoki narxi yangilangan bo‘lishi mumkin. Katalog ma’lumotlarini tekshirib qayta urinib ko‘ring.',
      orderCreatedTitle: 'Buyurtmangiz qabul qilindi',
      orderReplayedTitle: 'Buyurtma ma’lumoti tasdiqlandi',
      orderNumberLabel: 'Buyurtma raqami',
      orderStatusLabel: 'Holati',
      placedAtLabel: 'Rasmiylashtirilgan vaqt',
      contactLabel: 'Aloqa ma’lumotlari',
      fulfillmentSummaryTitle: 'Yetkazib berish va filial',
      branchLabel: 'Filial',
      paymentStatusLabel: 'To‘lov holati',
      paidAtLabel: 'To‘langan vaqt',
      unpaidLabel: 'To‘lanmagan',
      cancellationReasonLabel: 'Sabab / Izoh',
      historyTitle: 'Buyurtma holati tarixi',
      historyEmpty: 'Holat o‘zgarishlari tarixi hali mavjud emas.',
      subtotalLabel: 'Mahsulotlar summasi',
      discountTotalLabel: 'Chegirma',
      shippingTotalLabel: 'Yetkazib berish',
      shippingZeroNote: 'Yetkazib berish summasi 0 (olib ketish)',
      grandTotalLabel: 'Yakuniy summa',
      paymentPendingNote: 'Buyurtma yangi yaratildi — operator tasdiqlashini yoki to‘lov ko‘rsatmasini kuting.',
      viewMyOrdersButton: 'Buyurtmalarimga o‘tish',
      viewOrderDetailButton: 'Buyurtma tafsilotlari',
      continueShoppingButton: 'Xaridni davom ettirish',
      myOrdersTitle: 'Buyurtmalarim',
      myOrdersSubtitle: 'Akkauntingiz orqali berilgan barcha buyurtmalar va ularning holati',
      refreshButton: 'Yangilash',
      totalCountLabel: 'Jami',
      emptyTitle: 'Hozircha buyurtmalaringiz yo‘q',
      emptyDescription: 'Katalogdan mahsulot tanlab birinchi buyurtmangizni bering.',
      goToCatalogButton: 'Katalogga o‘tish',
      columns: {
        orderNumber: 'Buyurtma raqami',
        placedAt: 'Sana',
        status: 'Holati',
        itemsCount: 'Tovarlar',
        grandTotal: 'Summa',
        actions: 'Amallar',
      },
      viewDetailsAction: 'Batafsil',
      detailTitlePrefix: 'Buyurtma',
      backToOrdersButton: 'Buyurtmalarimga qaytish',
      loadingDetail: 'Buyurtma tafsilotlari yuklanmoqda...',
      notFoundTitle: 'Buyurtma topilmadi',
      notFoundSubtitle: 'So‘ralgan buyurtma mavjud emas yoki ushbu akkauntga tegishli emas.',
      customerInfoTitle: 'Buyurtma va aloqa ma’lumotlari',
      itemsListTitle: 'Buyurtma tarkibi',
      unitPriceLabel: 'Birlik narxi',
      discountLabel: 'Chegirma',
      lineTotalLabel: 'Satr jami',
      quantityLabel: 'Miqdor',
      summaryTitle: 'Hisob-kitob xulosasi',
      orderProgressTitle: 'Buyurtma bosqichlari',
      legacyStatusNote: 'Eski buyurtma holati ishlatilmoqda — quyida to‘liq holatlar tarixi keltirilgan.',
      cancelOrderButton: 'Buyurtmani bekor qilish',
      cancelModalTitle: 'Buyurtmani bekor qilish',
      cancelModalSubtitle: 'Buyurtmani bekor qilish sababini kiriting. Bu amal bekor qilingan buyurtmani tiklamaydi.',
      cancelReasonLabel: 'Bekor qilish sababi (majburiy, 1000 belgigacha)',
      cancelReasonPlaceholder: 'Masalan: Fikrimni o‘zgartirdim yoki boshqa mahsulot tanladim',
      cancelReasonRequired: 'Bekor qilish sababini kiriting.',
      cancelReasonMaxLength: 'Sabab 1000 ta belgidan oshmasligi kerak.',
      cancelConfirmButton: 'Ha, bekor qilish',
      cancelKeepOrderButton: 'Ortga qaytish',
      cancelSuccessMessage: 'Buyurtma bekor qilindi.',
      ratingSectionTitle: 'Xizmatni baholash',
      ratingFormPrompt: 'Yetkazib berish va xizmat sifatini 1 dan 5 gacha baholang.',
      ratingStarsLabel: 'Baho (1–5 yulduz)',
      ratingRequiredError: 'Iltimos, kamida 1 ta yulduzcha tanlang.',
      ratingCommentLabel: 'Izoh (ixtiyoriy, 1000 belgigacha)',
      ratingCommentPlaceholder: 'Xizmat yoki yetkazib berish haqida fikringizni yozing...',
      ratingCommentMaxLength: 'Izoh 1000 ta belgidan oshmasligi kerak.',
      ratingSubmitButton: 'Bahoni yuborish',
      ratingSuccessMessage: 'Rahmat! Xizmatga bergan bahongiz saqlandi.',
      ratedAtLabel: 'Baholangan vaqt',
      submittedReviewLabel: 'Sizning izohingiz',
      ratingOutOfFive: '5 dan',
      statusNames: {
        PENDING: 'Kutilmoqda',
        NEW_UNPAID: 'Yangi, to‘lanmagan',
        NEW_PAID: 'Yangi, to‘langan',
        CONFIRMED: 'Tasdiqlangan',
        PROCESSING: 'Tayyorlanmoqda',
        READY_FOR_PICKUP: 'Olib ketishga tayyor',
        PICKED_UP: 'Olib ketildi',
        READY_FOR_DELIVERY: 'Yetkazib berishga tayyor',
        SHIPPED: 'Jo‘natildi',
        OUT_FOR_DELIVERY: 'Kuryer yo‘lda',
        DELIVERY_FAILED: 'Yetkazib berilmadi',
        DELIVERED: 'Yetkazib berildi',
        CANCELLED: 'Bekor qilindi',
      },
      validation: {
        requiredPhone: 'Telefon raqamini kiriting',
        invalidPhone:
          'To‘g‘ri telefon raqamini kiriting (+, probel, qavs va defisdan tashqari 7–15 ta raqam bo‘lishi kerak)',
        requiredTelegram: 'Telegram manzilini kiriting',
        invalidTelegram: 'Masalan: @oson_xaridor yoki https://t.me/oson_xaridor',
        requiredBranch: 'Filialni tanlang',
        requiredDeliveryAddress: 'Yetkazib berish manzilini kiriting',
        requiredLocation: 'Yetkazib berish uchun lokatsiya nuqtasini tanlang',
        invalidLatitude: 'Kenglik -90 dan 90 gacha bo‘lishi kerak',
        invalidLongitude: 'Uzunlik -180 dan 180 gacha bo‘lishi kerak',
        emptyCart: 'Buyurtma berish uchun savatda kamida bitta mahsulot bo‘lishi kerak',
      },
    },
    adminTelegramRecipients: {
      menuGroupLabel: 'Buyurtmalar',
      title: 'Telegram xabarnomalari',
      subtitle: 'Yangi buyurtmalar haqida bildirishnoma oluvchi Telegram chat ID larini boshqaring',
      refreshButton: 'Yangilash',
      totalCountLabel: 'Jami qabul qiluvchilar',
      checkingPermissions: 'Admin ruxsatlari tekshirilmoqda...',
      userRoleBlockedTitle: 'ADMIN akkaunti bilan kirish kerak',
      userRoleBlockedSubtitle:
        'Telegram qabul qiluvchilarini boshqarish faqat administratorlar uchun ochiq. Joriy hisobingiz roli: USER.',
      switchAccountButton: 'ADMIN akkauntiga kirish',
      backendForbiddenTitle: 'Backend ruxsatni rad etdi (403)',
      backendForbiddenSubtitle:
        'Profilingiz ADMIN rolini qaytargan bo‘lsa ham, backend ushbu endpoint uchun 403 ruxsat xatosini berdi.',
      backendForbiddenEndpointLabel: 'Rad etilgan endpoint',
      backToStore: 'Do‘konga qaytish',
      botNoteTitle: 'Telegram bot ishlashi uchun eslatma',
      botNotePrivateChat:
        'Shaxsiy chatga xabar borishi uchun chat egasi botga avval /start yuborgan bo‘lishi kerak.',
      botNoteGroupChat:
        'Guruh yoki kanalga xabar borishi uchun bot guruhga qo‘shilgan va yozish huquqiga ega bo‘lishi kerak.',
      botNoteNoImmediateTest:
        'Chat ID qo‘shilganda darhol test xabari yuborilmaydi. Yangi buyurtma saqlangach, shu ro‘yxatga xabar navbatga qo‘yiladi.',
      formTitle: 'Chat ID qo‘shish',
      chatIdLabel: 'Telegram Chat ID',
      chatIdPlaceholder: '-1001234567890',
      chatIdHelp: 'Shaxsiy chatda musbat, guruhda manfiy butun son satri (masalan: -1001234567890)',
      labelLabel: 'Izoh / Nom (ixtiyoriy)',
      labelPlaceholder: 'Ombor guruhi',
      addButton: 'Qo‘shish',
      emptyTitle: 'Hozircha chat ID lar qo‘shilmagan',
      emptyDescription:
        'Yangi buyurtmalar haqida bildirishnoma olish uchun kamida bitta Telegram chat ID qo‘shing.',
      columns: {
        chatId: 'Chat ID',
        label: 'Nomi / Izoh',
        actions: 'Amallar',
      },
      noLabel: '—',
      deleteButton: 'O‘chirish',
      deleteConfirmTitle: 'Chat ID ni o‘chirasizmi?',
      deleteConfirmDescription:
        'Ushbu Telegram chatiga endi yangi buyurtma xabarnomalari yuborilmaydi.',
      deleteConfirmOk: 'Ha, o‘chirish',
      deleteConfirmCancel: 'Bekor qilish',
      validation: {
        chatIdRequired: 'Telegram Chat ID ni kiriting',
        chatIdInvalid: 'Chat ID faqat raqamlardan (boshida - bo‘lishi mumkin) iborat bo‘lishi kerak',
        labelMaxLength: 'Izoh 100 ta belgidan oshmasligi kerak',
      },
      notifications: {
        createdSuccess: 'Telegram chat ID ro‘yxatga qo‘shildi.',
        deletedSuccess: 'Telegram chat ID ro‘yxatdan o‘chirildi.',
      },
    },
    adminOrders: {
      title: 'Buyurtmalar',
      subtitle: 'Barcha xaridor buyurtmalarini ko‘ring, qidiring va holatini boshqaring',
      refreshButton: 'Yangilash',
      telegramSettingsButton: 'Telegram xabarnomalari',
      totalCountLabel: 'Jami buyurtmalar',
      statusFilterLabel: 'Holat bo‘yicha',
      allStatusesOption: 'Barcha holatlar',
      orderNumberPlaceholder: 'Buyurtma raqami (to‘liq, masalan: OM-...)',
      clearFilters: 'Filtrlarni tozalash',
      emptyTitle: 'Buyurtmalar topilmadi',
      emptyDescription: 'Joriy filtrlar bo‘yicha hech qanday buyurtma mavjud emas.',
      columns: {
        orderNumber: 'Buyurtma raqami',
        placedAt: 'Sana',
        status: 'Holati',
        branch: 'Filial',
        fulfillment: 'Usul',
        payment: 'To‘lov',
        contact: 'Aloqa',
        grandTotal: 'Jami summa',
        actions: 'Amallar',
      },
      paidBadge: 'To‘langan',
      unpaidBadge: 'To‘lanmagan',
      viewDetailsAction: 'Batafsil',
      detailTitlePrefix: 'Buyurtma',
      backToListButton: 'Buyurtmalar ro‘yxatiga qaytish',
      loadingDetail: 'Buyurtma tafsilotlari yuklanmoqda...',
      notFoundTitle: 'Buyurtma topilmadi',
      notFoundSubtitle: 'So‘ralgan buyurtma mavjud emas yoki o‘chirilgan.',
      statusSectionTitle: 'Buyurtma holatini boshqarish',
      currentStatusLabel: 'Joriy holat',
      availableTransitionsLabel: 'Keyingi ruxsat etilgan holatlar',
      reasonModalTitle: 'Holat o‘zgarishi sababi / izohi',
      reasonLabelDefault: 'Sabab (majburiy, 1000 belgigacha)',
      reasonLabelPaid: 'To‘lovni tasdiqlovchi izoh (majburiy, 1000 belgigacha)',
      reasonPlaceholderDefault: 'Sababni kiriting...',
      reasonPlaceholderPaid: 'Masalan: Payme/Click tranzaksiya #12345 orqali to‘lov tasdiqlandi',
      reasonPlaceholderCancelled: 'Masalan: Xaridor bekor qilishni so‘radi',
      reasonPlaceholderDeliveryFailed: 'Masalan: Xaridor qo‘ng‘iroqqa javob bermadi',
      reasonRequiredError: 'Ushbu holatga o‘tish uchun sabab yoki izoh kiritish majburiy.',
      reasonMaxLengthError: 'Izoh 1000 ta belgidan oshmasligi kerak.',
      confirmTransitionButton: 'Tasdiqlash',
      cancelTransitionButton: 'Bekor qilish',
      fulfillmentSectionTitle: 'Filial va yetkazib berishni tahrirlash',
      fulfillmentEditLockedHint:
        'Filial va yetkazib berish usulini faqat to‘lov qayd etilmagan va PENDING, NEW_UNPAID yoki CONFIRMED holatidagi buyurtmalarda o‘zgartirish mumkin.',
      saveFulfillmentButton: 'Qabul qilish usulini saqlash',
      testQuoteButton: 'Tarifni sinash',
      fulfillmentUpdatedSuccess: 'Buyurtmaning filial va yetkazib berish ma’lumotlari yangilandi.',
      statusUpdatedSuccess: 'Buyurtma holati yangilandi.',
      conflictReloadNotice:
        'Buyurtma holati boshqa admin tomonidan o‘zgartirilgan. Eng so‘nggi ma’lumotlar qayta yuklandi.',
      customerInfoTitle: 'Xaridor aloqa ma’lumotlari',
      itemsListTitle: 'Buyurtma tarkibi',
      summaryTitle: 'Hisob-kitob xulosasi',
      historyTitle: 'Buyurtma o‘zgarishlar tarixi',
      historyActorLabel: 'Bajaruvchi ID',
      historyEmpty: 'Tarix yozuvlari hali mavjud emas.',
      noContactValue: '—',
      serviceRatingTitle: 'Xaridor bahosi',
    },
    adminBranches: {
      menuGroupLabel: 'Admin paneli',
      title: 'Filiallar',
      subtitle: 'Olib ketish va yetkazib berish filiallari, ish vaqti va kilometr tariflarini boshqaring',
      createButton: 'Yangi filial',
      refreshButton: 'Yangilash',
      totalCountLabel: 'Jami filiallar',
      emptyTitle: 'Filiallar topilmadi',
      emptyDescription: 'Hozircha birorta filial qo‘shilmagan. Birinchi filialni yarating.',
      columns: {
        image: 'Rasm',
        name: 'Nomi',
        address: 'Manzil',
        phone: 'Telefon',
        workingHours: 'Ish vaqti',
        status: 'Holati',
        services: 'Xizmat turlari',
        pricePerKm: 'Km tarifi',
        actions: 'Amallar',
      },
      statusActive: 'Faol',
      statusInactive: 'Nofaol',
      statusArchived: 'Arxivlangan',
      pickupBadge: 'Olib ketish',
      deliveryBadge: 'Yetkazish',
      noServicesLabel: 'Xizmat o‘chirilgan',
      perKmSuffix: 'so‘m/km',
      viewButton: 'Tafsilot',
      editButton: 'Tahrirlash',
      archiveButton: 'Arxivlash',
      archiveConfirmTitle: 'Filialni arxivlaysizmi?',
      archiveConfirmDescription:
        'Arxivlangan filial xaridor checkout ro‘yxatida ko‘rinmaydi.',
      archiveConfirmOk: 'Ha, arxivlash',
      archiveConfirmCancel: 'Bekor qilish',
      detailDrawerTitle: 'Filial tafsiloti',
      detailLoading: 'Filial ma’lumotlari yuklanmoqda...',
      quoteTesterTitle: 'Yetkazib berish tarifini tekshirish',
      quoteTesterButton: 'Hisoblab ko‘rish',
      drawerCreateTitle: 'Yangi filial qo‘shish',
      drawerEditTitle: 'Filialni tahrirlash',
      codeLabel: 'Filial kodi (slug)',
      codePlaceholder: 'toshkent-markaz',
      nameUzLabel: 'Nomi (O‘zbekcha)',
      nameUzPlaceholder: 'Toshkent markaz',
      nameRuLabel: 'Nomi (Ruscha)',
      nameRuPlaceholder: 'Ташкент центр',
      cityLabel: 'Shahar',
      cityPlaceholder: 'Toshkent',
      addressLineLabel: 'Manzil',
      addressLinePlaceholder: 'Markaz ko‘chasi 1',
      phoneLabel: 'Telefon',
      phonePlaceholder: '+998901234567',
      emailLabel: 'Email',
      emailPlaceholder: 'branch@example.com',
      workingHoursLabel: 'Ish vaqti',
      workingHoursPlaceholder: '09:00–20:00',
      pricePerKmLabel: 'Kilometr tarifi (UZS/km)',
      activeLabel: 'Filial faol',
      pickupEnabledLabel: 'Olib ketish mavjud',
      deliveryEnabledLabel: 'Yetkazish mavjud',
      locationTitle: 'Filial koordinatalari',
      getLocationButton: 'Joylashuvimni olish',
      gettingLocationLabel: 'Aniqlanmoqda...',
      resolvingAddressLabel: 'Koordinatalar bo‘yicha manzil aniqlanmoqda...',
      approximateAddressBadge: 'Taxminiy',
      approximateAddressHint:
        'Aniq uy raqami topilmadi. Zarur bo‘lsa ko‘cha va uy raqamini qo‘lda aniqlashtiring.',
      geocodeFallbackHint:
        'Manzilni avtomatik aniqlab bo‘lmadi — shahar va manzilni qo‘lda kiriting.',
      detectedAreaLabel: 'Aniqlangan hudud',
      mapPickHint:
        'Xaritaga bosing, markerni suring yoki «Joylashuvimni olish» tugmasini bosing — manzil avtomatik to‘ldiriladi.',
      imageSectionTitle: 'Filial rasmi',
      imageUploadHint: 'PNG, JPEG yoki WebP, 5 MB gacha',
      selectImageButton: 'Rasm tanlash',
      replaceImageButton: 'Rasmni almashtirish',
      removeImageButton: 'Rasmni olib tashlash',
      removeImageConfirm: 'Filial rasmini olib tashlaysizmi?',
      saveButton: 'Saqlash',
      cancelButton: 'Bekor qilish',
      validation: {
        codeRequired: 'Filial kodini kiriting',
        nameUzRequired: 'O‘zbekcha nomni kiriting',
        nameRuRequired: 'Ruscha nomni kiriting',
        cityRequired: 'Shaharni kiriting',
        addressRequired: 'Manzilni kiriting',
        phoneRequired: 'Telefon raqamini kiriting',
        invalidPhone: 'To‘g‘ri telefon raqamini kiriting',
        emailInvalid: 'To‘g‘ri email manzilini kiriting',
        workingHoursRequired: 'Ish vaqtini kiriting',
        pricePerKmRequired: 'Kilometr tarifini kiriting (0 dan katta yoki teng)',
        coordinatesRequired: 'Filial koordinatalarini tanlang yoki kiriting',
        imageInvalidType: 'Faqat PNG, JPEG yoki WebP rasmlar qabul qilinadi',
        imageTooLarge: 'Rasm hajmi 5 MB dan oshmasligi kerak',
        imageUnreadable: 'Tanlangan rasmni o‘qib bo‘lmadi',
      },
      notifications: {
        createdSuccess: 'Yangi filial yaratildi.',
        updatedSuccess: 'Filial ma’lumotlari yangilandi.',
        archivedSuccess: 'Filial arxivlandi.',
        imageUpdatedSuccess: 'Filial rasmi yangilandi.',
        imageDeletedSuccess: 'Filial rasmi olib tashlandi.',
      },
    },
    branchesPage: {
      title: 'Oson Market filiallari',
      subtitle:
        'Eng yaqin filialni toping, ish vaqti, aloqa raqami va olib ketish yoki yetkazib berish xizmatlarini ko‘ring.',
      getLocationButton: 'Joylashuvimni olish',
      gettingLocationLabel: 'Joylashuv aniqlanmoqda...',
      pickOnMapButton: 'Xaritadan joy tanlash',
      hideMapButton: 'Xaritani yopish',
      clearLocationButton: 'Joylashuvni tozalash',
      mapHint: 'Masofani hisoblash uchun xaritaga bosing yoki yashil belgini suring.',
      selectedPointLabel: 'Tanlangan nuqta',
      resolvingAddressLabel: 'Manzil aniqlanmoqda...',
      sortedByNearestNotice: 'Filiallar tanlangan nuqtadan eng yaqini bo‘yicha tartiblandi',
      defaultOrderNotice:
        'Eng yaqin filialgacha bo‘lgan masofani ko‘rish uchun joylashuvingizni ulashing yoki xaritadan nuqta tanlang.',
      distanceLabel: 'Masofa',
      distanceUnavailable: 'Masofa mavjud emas',
      pickupAvailable: 'Olib ketish',
      deliveryAvailable: 'Yetkazish',
      emptyTitle: 'Faol filiallar topilmadi',
      emptyDescription: 'Hozircha faol filiallar ro‘yxati bo‘sh.',
      refreshButton: 'Yangilash',
      workingHoursLabel: 'Ish vaqti',
      phoneLabel: 'Telefon',
      totalBranchesLabel: 'Jami filiallar',
    },
    notificationsPanel: {
      bellAriaLabel: 'Bildirishnomalar',
      drawerTitle: 'Bildirishnomalar',
      unreadCountLabel: 'O‘qilmagan',
      refreshButton: 'Yangilash',
      emptyTitle: 'Bildirishnomalar yo‘q',
      emptyDescription: 'Buyurtma holati o‘zgarganda yangi bildirishnomalar shu yerda ko‘rinadi.',
      unreadLabel: 'Yangi',
      readLabel: 'O‘qilgan',
      openOrderHint: 'Buyurtmani ochish',
      statusAtEventLabel: 'Xabar vaqtidagi holat',
      reasonLabel: 'Izoh / Sabab',
      loadMoreButton: 'Yana yuklash',
      rateServiceAction: 'Xizmatni baholash',
    },
    adminSiteLogo: {
      title: 'Sayt logosi',
      subtitle: 'Header, kirish sahifalari va brauzer favicon’i uchun asosiy sayt logosini boshqaring',
      refreshButton: 'Yangilash',
      currentLogoTitle: 'Joriy logo',
      currentLogoSubtitle: 'Saytning barcha sahifalarida hozir ko‘rinib turgan logo',
      fallbackNote: 'Agar logo yuklanmasa, saytda «Oson Market» matni ko‘rsatiladi.',
      uploadSectionTitle: 'Yangi logo yuklash',
      fileHint: 'PNG yoki JPEG format · ko‘pi bilan 2 MB · maksimal o‘lcham 2048×2048 px',
      previewTitle: 'Oldindan ko‘rish',
      previewAlt: 'Yangi sayt logosi namunasi',
      previewEmpty: 'Saqlashdan oldin bu yerda ko‘rish uchun PNG yoki JPEG fayl tanlang',
      selectFileButton: 'Fayl tanlash',
      changeFileButton: 'Boshqa fayl tanlash',
      resetSelectionButton: 'Bekor qilish',
      saveButton: 'Saqlash',
      savedSuccess: 'Sayt logosi muvaffaqiyatli yangilandi.',
      checkingPermissions: 'Administrator huquqlari tekshirilmoqda...',
      userRoleBlockedTitle: 'ADMIN hisobi bilan kirish talab qilinadi',
      userRoleBlockedSubtitle:
        'Sayt logosini o‘zgartirish faqat administratorlar uchun ochiq. Joriy hisobingiz turi: USER.',
      switchAccountButton: 'ADMIN sifatida kirish',
      backendForbiddenTitle: 'Server so‘rovni rad etdi (403)',
      backendForbiddenSubtitle:
        'Profilingiz ADMIN rolida bo‘lsa-da, backend ushbu amal uchun 403 ruxsat xatosini qaytardi.',
      backendForbiddenEndpointLabel: 'Rad etilgan endpoint',
      backToStore: 'Do‘konga qaytish',
      validation: {
        invalidType: 'Faqat PNG yoki JPEG formatidagi rasm yuklang',
        tooLarge: 'Fayl hajmi 2 MB dan oshmasligi kerak',
        invalidDimensions: 'Rasmning har bir tomoni ko‘pi bilan 2048 px bo‘lishi kerak',
        unreadable: 'Tanlangan rasm faylini o‘qib bo‘lmadi',
      },
    },
    adminSiteAbout: {
      title: 'Biz haqimizda',
      subtitle: 'O‘zbek va rus tillarida «Biz haqimizda» bo‘limi sarlavhasi va matnini boshqaring',
      refreshButton: 'Yangilash',
      retryButton: 'Qayta urinish',
      lastUpdatedLabel: 'So‘nggi yangilanish',
      notCreatedYet: 'Hali yaratilmagan',
      emptyNoticeTitle: 'Bo‘lim hali yaratilmagan',
      emptyNoticeDescription:
        'Har ikki til uchun sarlavha va tavsifni kiriting, so‘ng «Saqlash» tugmasini bosing.',
      uzSectionTitle: 'O‘zbekcha',
      uzSectionBadge: 'UZ',
      ruSectionTitle: 'Русский',
      ruSectionBadge: 'RU',
      titleLabel: 'Sarlavha',
      titlePlaceholderUz: 'Biz haqimizda',
      titlePlaceholderRu: 'О нас',
      descriptionLabel: 'Tavsif',
      descriptionPlaceholderUz: 'Oson Market haqida o‘zbekcha matn...',
      descriptionPlaceholderRu: 'Текст об Oson Market на русском языке...',
      saveButton: 'Saqlash',
      savedSuccess: '«Biz haqimizda» bo‘limi muvaffaqiyatli saqlandi.',
      loadErrorFallback: '«Biz haqimizda» ma’lumotlarini yuklab bo‘lmadi.',
      saveErrorFallback: '«Biz haqimizda» ma’lumotlarini saqlab bo‘lmadi.',
      savedPreviewTitle: 'Saqlangan oddiy matn ko‘rinishi',
      savedPreviewSubtitle: 'Tavsifdagi qator tashlashlar saqlangan holda ko‘rsatiladi',
      checkingPermissions: 'Administrator huquqlari tekshirilmoqda...',
      userRoleBlockedTitle: 'ADMIN hisobi bilan kirish talab qilinadi',
      userRoleBlockedSubtitle:
        '«Biz haqimizda» bo‘limini boshqarish faqat administratorlar uchun ochiq. Joriy hisobingiz turi: USER.',
      switchAccountButton: 'ADMIN sifatida kirish',
      backendForbiddenTitle: 'Ruxsat rad etildi (403)',
      backendForbiddenSubtitle:
        'Sizda «Biz haqimizda» bo‘limini ko‘rish yoki tahrirlash uchun administrator ruxsati yo‘q.',
      backendForbiddenEndpointLabel: 'Rad etilgan endpoint',
      backToStore: 'Do‘konga qaytish',
      validation: {
        titleRequiredUz: 'O‘zbekcha sarlavhani kiriting.',
        titleMaxLengthUz: 'O‘zbekcha sarlavha 200 ta belgidan oshmasligi kerak.',
        descriptionRequiredUz: 'O‘zbekcha tavsifni kiriting.',
        descriptionMaxLengthUz: 'O‘zbekcha tavsif 10 000 ta belgidan oshmasligi kerak.',
        titleRequiredRu: 'Ruscha sarlavhani kiriting.',
        titleMaxLengthRu: 'Ruscha sarlavha 200 ta belgidan oshmasligi kerak.',
        descriptionRequiredRu: 'Ruscha tavsifni kiriting.',
        descriptionMaxLengthRu: 'Ruscha tavsif 10 000 ta belgidan oshmasligi kerak.',
        socialUrlHttps: 'Faqat https:// bilan boshlanadigan to‘liq havolani kiriting.',
        socialUrlMaxLength: 'Havola uzunligi 2048 ta belgidan oshmasligi kerak.',
      },
      socialLinksSectionTitle: 'Ijtimoiy tarmoqlar',
      socialLinksSectionSubtitle:
        'Ixtiyoriy havolalar. Faqat to‘liq https:// manzillar qabul qilinadi (bo‘sh maydonlar saqlanmaydi).',
      socialLinksUrlHint: 'Masalan: https://... · ko‘pi bilan 2048 ta belgi',
      socialLinksClearAllButton: 'Barcha havolalarni tozalash',
    },
    aboutPage: {
      pageTitle: 'Biz haqimizda',
      defaultTitle: 'Biz haqimizda',
      emptyTitle: 'Ma’lumot hozircha e’lon qilinmagan',
      emptyDescription: 'Kompaniya haqida ma’lumot tez orada joylanadi.',
      refreshButton: 'Yangilash',
      retryButton: 'Qayta urinish',
      lastUpdatedLabel: 'Yangilangan vaqti',
      socialLinksTitle: 'Ijtimoiy tarmoqlar',
      backToStore: 'Katalogga qaytish',
    },
    adminUsers: {
      title: 'Foydalanuvchilar',
      subtitle: 'Ro‘yxatdan o‘tgan foydalanuvchilarni ko‘rish, qidirish va holatini boshqarish',
      refreshButton: 'Yangilash',
      retryButton: 'Qayta urinish',
      totalCountLabel: 'Jami foydalanuvchilar',
      searchPlaceholder: 'Ism, familiya, telefon, email yoki username bo‘yicha qidirish...',
      searchMaxHint: 'Ko‘pi bilan 255 ta belgi',
      roleFilterLabel: 'Rol',
      roleFilterAll: 'Barchasi',
      statusFilterLabel: 'Holat',
      statusFilterAll: 'Barchasi',
      clearFilters: 'Filtrlarni tozalash',
      checkingPermissions: 'Admin ruxsatlari tekshirilmoqda...',
      userRoleBlockedTitle: 'Bu bo‘lim faqat administratorlar uchun',
      userRoleBlockedSubtitle:
        'Siz oddiy foydalanuvchi hisobi bilan kirgansiz. Foydalanuvchilarni boshqarish uchun admin hisobi bilan kiring.',
      switchAccountButton: 'Boshqa hisob bilan kirish',
      backendForbiddenTitle: 'Server bu amalni rad etdi (403)',
      backendForbiddenSubtitle:
        'Sizning hisobingiz ushbu admin bo‘limiga kirish huquqiga ega emas.',
      backendForbiddenEndpointLabel: 'So‘rov manzili',
      backToStore: 'Do‘konga qaytish',
      notProvided: 'Kiritilmagan',
      emptyTitle: 'Foydalanuvchilar topilmadi',
      emptyDescription: 'Hozircha ro‘yxatdan o‘tgan foydalanuvchilar mavjud emas.',
      emptyFilteredDescription:
        'Tanlangan qidiruv yoki filtr shartlariga mos foydalanuvchi topilmadi.',
      paginationTotalTemplate: 'Jami {total} ta',
      roleNames: {
        USER: 'USER (Xaridor)',
        ADMIN: 'ADMIN',
      },
      statusNames: {
        ACTIVE: 'Faol',
        BLOCKED: 'Bloklangan',
      },
      columns: {
        fullName: 'Ism va familiya',
        username: 'Username',
        email: 'Email',
        phone: 'Telefon',
        role: 'Rol',
        status: 'Holat',
        createdAt: 'Ro‘yxatdan o‘tgan sana',
        actions: 'Amallar',
      },
      actions: {
        viewDetails: 'Batafsil',
        block: 'Bloklash',
        activate: 'Faollashtirish',
      },
      detail: {
        title: 'Foydalanuvchi ma’lumotlari',
        loading: 'Foydalanuvchi ma’lumotlari yuklanmoqda...',
        accountIdLabel: 'Akkaunt ID',
        fullNameLabel: 'Ism va familiya',
        firstNameLabel: 'Ism',
        lastNameLabel: 'Familiya',
        usernameLabel: 'Username',
        emailLabel: 'Email',
        phoneLabel: 'Telefon raqam',
        roleLabel: 'Rol',
        statusLabel: 'Holat',
        languageLabel: 'Interfeys tili',
        emailVerificationLabel: 'Email tasdiqlanishi',
        emailVerifiedBadge: 'Tasdiqlangan',
        emailUnverifiedBadge: 'Tasdiqlanmagan',
        createdAtLabel: 'Ro‘yxatdan o‘tgan sana',
        updatedAtLabel: 'So‘nggi yangilanish',
        adminImmutableNote:
          'Administrator hisoblarining holatini bu yerdan o‘zgartirib bo‘lmaydi.',
        closeButton: 'Yopish',
      },
      confirmModal: {
        blockTitle: 'Foydalanuvchini bloklash',
        blockDescription: 'Ushbu foydalanuvchi akkauntini bloklashni tasdiqlaysizmi?',
        blockSessionWarning:
          'Bloklash foydalanuvchining barcha mavjud faol sessiyalarini darhol yakunlaydi.',
        activateTitle: 'Foydalanuvchini faollashtirish',
        activateDescription:
          'Ushbu foydalanuvchi akkauntini qayta faollashtirishni tasdiqlaysizmi?',
        accountSummaryLabel: 'Tanlangan akkaunt',
        blockConfirmButton: 'Ha, bloklash',
        activateConfirmButton: 'Ha, faollashtirish',
        cancelButton: 'Bekor qilish',
      },
      notifications: {
        blockedSuccess: 'Foydalanuvchi bloklandi va faol sessiyalari yakunlandi.',
        activatedSuccess: 'Foydalanuvchi akkaunti faollashtirildi.',
        notFoundError: 'Foydalanuvchi akkaunti topilmadi.',
      },
    },
    adminStatistics: {
      title: 'Statistika',
      subtitle: 'Do‘kon ko‘rsatkichlari, buyurtmalar, katalog, xaridorlar va operatsiyalar bo‘yicha hisobotlar',
      refreshButton: 'Yangilash',
      retryButton: 'Qayta urinish',
      checkingPermissions: 'Admin ruxsatlari tekshirilmoqda...',
      userRoleBlockedTitle: 'Bu bo‘lim faqat administratorlar uchun',
      userRoleBlockedSubtitle:
        'Siz oddiy foydalanuvchi hisobi bilan kirgansiz. Statistikani ko‘rish uchun admin hisobi bilan kiring.',
      switchAccountButton: 'Boshqa hisob bilan kirish',
      backendForbiddenTitle: 'Server bu amalni rad etdi (403)',
      backendForbiddenSubtitle:
        'Sizning hisobingiz statistika bo‘limini ko‘rish huquqiga ega emas.',
      backendForbiddenEndpointLabel: 'So‘rov manzili',
      backToStore: 'Do‘konga qaytish',
      noData: 'Ma’lumot yo‘q',
      periodBadgePrefix: 'Davr',
      currentStateBadge: 'Joriy holat',
      timezoneLabel: 'Vaqt mintaqasi',
      tashkentTimezoneValue: 'Toshkent (UTC+5)',
      presets: {
        last7: '7 kun',
        last30: '30 kun',
        last90: '90 kun',
        custom: 'Maxsus oraliq',
      },
      fromLabel: 'Boshlanish sanasi',
      toLabel: 'Tugash sanasi',
      limitLabel: 'Reyting limiti',
      validation: {
        invalidDates: 'Boshlanish va tugash sanalarini to‘g‘ri kiriting.',
        fromAfterTo: 'Boshlanish sanasi tugash sanasidan keyin bo‘lishi mumkin emas.',
        maxDaysExceeded: 'Tanlangan sana oralig‘i 366 kundan oshmasligi kerak.',
      },
      sections: {
        OVERVIEW: 'Umumiy',
        ORDERS: 'Buyurtmalar',
        CATALOG: 'Katalog',
        CUSTOMERS: 'Foydalanuvchilar',
        BRANCHES: 'Filiallar',
        ENGAGEMENT: 'Faollik',
        OPERATIONS: 'Operatsiyalar',
      },
      emptyTitle: 'Tanlangan davr uchun ma’lumot topilmadi',
      emptyDescription: 'Ushbu sana oralig‘ida tegishli ko‘rsatkichlar qayd etilmagan.',
      tableExpandDetails: 'Batafsil',
      tableCollapseDetails: 'Yopish',
      chartTableToggleShow: 'Jadval ko‘rinishini ochish',
      chartTableToggleHide: 'Jadval ko‘rinishini yopish',
      chartDateColumn: 'Sana',
      chartNoPoints: 'Tanlangan davrda kunlik ma’lumotlar mavjud emas.',
      overview: {
        kpiSectionTitle: 'Asosiy ko‘rsatkichlar',
        otherMetricsTitle: 'Qo‘shimcha umumiy ko‘rsatkichlar',
        dailyChartTitle: 'Kunlik dinamika',
        dailyChartSubtitle: 'Buyurtmalar, ro‘yxatdan o‘tishlar, izohlar va to‘lov belgilarining kunlik o‘zgarishi',
        currencySectionTitle: 'Valyuta bo‘yicha buyurtma summalari',
        openReportHint: 'Batafsil hisobotga o‘tish',
        series: {
          orders: 'Buyurtmalar',
          registrations: 'Ro‘yxatdan o‘tishlar',
          comments: 'Izohlar',
          payments_marked: 'To‘langan deb belgilangan',
        },
      },
      ordersSection: {
        byStatusTitle: 'Buyurtma holatlari bo‘yicha taqsimot',
        byFulfillmentTitle: 'Qabul qilish usuli bo‘yicha taqsimot',
        fulfillmentMetricsTitle: 'Ijro va sifat ko‘rsatkichlari',
        uniqueCustomers: 'Noyob xaridorlar',
        cancellationsWithReason: 'Sababi kiritilgan bekor qilishlar',
        averageRating: 'O‘rtacha baho',
        averageDistanceKm: 'O‘rtacha masofa',
        ratingsTitle: 'Xizmat baholari (1–5 yulduz)',
        starsSuffix: 'yulduz',
        statusChangesTitle: 'Holat o‘tishlari tarixi',
        fromStatusCol: 'Avvalgi holat',
        toStatusCol: 'Yangi holat',
        transitionsCol: 'O‘tishlar soni',
        topVariantsTitle: 'Eng ko‘p buyurtma qilingan variantlar',
        skuCol: 'SKU',
        productCol: 'Mahsulot',
        ordersCountCol: 'Buyurtmalar',
        unitsSoldCol: 'Sotilgan dona',
        discountCol: 'Chegirma',
        totalAmountCol: 'Summa',
        currencyTotalsTitle: 'Valyuta bo‘yicha buyurtma ko‘rsatkichlari',
        currencyCol: 'Valyuta',
        subtotalCol: 'Subtotallar',
        shippingCol: 'Yetkazib berish',
        paidMarkedCol: 'To‘langan deb belgilangan summa',
        completedAmountCol: 'Yakunlangan buyurtmalar summasi',
        multiCurrencyNote: 'Har bir valyuta alohida hisoblanadi va umumlashtirilmaydi.',
      },
      catalogSection: {
        inventoryTitle: 'Katalog inventari',
        qualityTitle: 'Katalog sifati va to‘liqligi',
        distributionsTitle: 'Katalog taqsimoti',
        translationsTitle: 'Tarjimalar qamrovi',
        productTranslationsTitle: 'Mahsulot tarjimalari',
        categoryTranslationsTitle: 'Kategoriya tarjimalari',
        topCategoriesTitle: 'Yetakchi kategoriyalar',
        topBrandsTitle: 'Yetakchi brendlar',
        nameCol: 'Nomi',
        slugCol: 'Slug',
        statusCol: 'Holat',
        productsCountCol: 'Mahsulotlar soni',
        activeLabel: 'Faol',
        inactiveLabel: 'Nofaol',
        withoutImages: 'Rasmsiz yozuvlar',
        withoutActivePrice: 'Amaldagi narxsiz yozuvlar',
        withoutCategory: 'Kategoriyasiz mahsulotlar',
        withoutBrand: 'Brendsiz mahsulotlar',
        productStatuses: 'Mahsulot holatlari',
        productKinds: 'Mahsulot turlari',
        variantStatuses: 'Variant holatlari',
        categoryStatuses: 'Kategoriya holatlari',
        brandStatuses: 'Brend holatlari',
        languageCol: 'Til',
        recordsCountCol: 'Yozuvlar soni',
      },
      customersSection: {
        accountsTitle: 'Akkauntlar va profillar',
        distributionsTitle: 'Foydalanuvchilar taqsimoti',
        byRoleTitle: 'Rollar bo‘yicha',
        byStatusTitle: 'Holat bo‘yicha',
        byLanguageTitle: 'Til bo‘yicha',
        orderFrequencyTitle: 'Xarid chastotasi',
        dailyRegistrationsTitle: 'Kunlik ro‘yxatdan o‘tishlar dinamikasi',
        ordersBucketUnit: 'buyurtma',
      },
      branchesSection: {
        byStatusTitle: 'Filiallar holati',
        capabilitiesTitle: 'Xizmat imkoniyatlari',
        branchOrdersTitle: 'Filiallar bo‘yicha buyurtmalar',
        branchCol: 'Filial',
        unassignedBranch: 'Filial biriktirilmagan',
        currencyCol: 'Valyuta',
        methodCol: 'Usul',
        totalOrdersCol: 'Jami',
        cancelledCol: 'Bekor qilingan',
        completedCol: 'Yakunlangan',
        completedAmountCol: 'Yakunlangan summa',
        shippingAmountCol: 'Yetkazish summasi',
        avgDistanceCol: 'O‘rtacha masofa',
        avgRatingCol: 'O‘rtacha baho',
      },
      engagementSection: {
        commentsTitle: 'Izohlar faolligi',
        likesTitle: 'Joriy layklar holati',
        currentLikesSubtitle: 'Hozirgi vaqtdagi umumiy layklar (sana filtriga bog‘liq emas)',
        dailyCommentsTitle: 'Kunlik izohlar dinamikasi',
        topLikedTitle: 'Eng ko‘p layk olgan mahsulotlar',
        topCommentedTitle: 'Eng ko‘p izoh yozilgan mahsulotlar',
        productCol: 'Mahsulot',
        likesCountCol: 'Layklar',
        commentsCountCol: 'Izohlar',
      },
      operationsSection: {
        siteTitle: 'Sayt va kanal sozlamalari holati',
        mediaTitle: 'Media fayllar turi bo‘yicha',
        verificationTitle: 'Tasdiqlash kodlari statistikasi',
        queuesTitle: 'Bildirishnomalar va yuborish navbatlari',
        notificationsQueueTitle: 'Ichki bildirishnomalar',
        emailQueueTitle: 'Email navbati',
        telegramQueueTitle: 'Telegram navbati',
        configuredLabel: 'Sozlangan',
        notConfiguredLabel: 'Sozlanmagan',
        mediaTypeCol: 'Media turi',
        filesCountCol: 'Fayllar soni',
        totalSizeCol: 'Umumiy hajmi',
        purposeCol: 'Maqsadi',
        issuedCol: 'Chiqarilgan',
        usedCol: 'Ishlatilgan',
        expiredCol: 'Muddati tugagan',
      },
      labels: {
        orders: 'Buyurtmalar soni',
        orders_in_period: 'Davrdagi buyurtmalar',
        total_orders: 'Jami buyurtmalar',
        completed_orders: 'Yakunlangan buyurtmalar',
        cancelled_orders: 'Bekor qilingan buyurtmalar',
        paid_orders: 'To‘langan deb belgilangan buyurtmalar',
        payments_marked: 'To‘langan deb belgilangan',
        payments_marked_in_period: 'To‘langan deb belgilangan (davr)',
        total_accounts: 'Jami akkauntlar',
        accounts: 'Jami akkauntlar',
        new_registrations: 'Yangi ro‘yxatdan o‘tganlar',
        registrations: 'Yangi ro‘yxatdan o‘tganlar',
        email_verified: 'Emaili tasdiqlanganlar',
        verified_emails: 'Emaili tasdiqlanganlar',
        google_linked: 'Google bog‘langan akkauntlar',
        complete_profiles: 'To‘liq profillar',
        with_avatar: 'Avatari bor profillar',
        products: 'Mahsulotlar',
        total_products: 'Jami mahsulotlar',
        active_products: 'Faol mahsulotlar',
        categories: 'Kategoriyalar',
        brands: 'Brendlar',
        variants: 'Variantlar',
        images: 'Rasmlar',
        prices: 'Narx yozuvlari',
        price_records: 'Narx yozuvlari',
        branches: 'Filiallar',
        active_branches: 'Faol filiallar',
        pickup_enabled: 'Olib ketish yoqilgan filiallar',
        delivery_enabled: 'Yetkazib berish yoqilgan filiallar',
        comments: 'Yozilgan izohlar',
        total_comments: 'Yozilgan izohlar',
        written_comments: 'Yozilgan izohlar',
        new_comments: 'Yangi izohlar',
        replies: 'Javoblar',
        edited: 'Tahrirlangan izohlar',
        deleted: 'O‘chirilgan izohlar',
        commenting_users: 'Izoh yozgan foydalanuvchilar',
        unique_authors: 'Izoh yozgan foydalanuvchilar',
        likes: 'Joriy layklar',
        current_likes: 'Joriy layklar',
        product_likes: 'Mahsulot layklari',
        comment_likes: 'Izoh layklari',
        unread_notifications: 'O‘qilmagan bildirishnomalar',
        read: 'O‘qilgan',
        unread: 'O‘qilmagan',
        sent: 'Yuborilgan',
        sent_in_period: 'Davrda yuborilgan',
        pending: 'Kutilayotgan',
        stopped: 'To‘xtatilgan',
        paused: 'To‘xtatilgan',
        failed: 'To‘xtatilgan / xato',
        retries: 'Qayta urinishlar',
        retry_count: 'Qayta urinishlar',
        retried: 'Qayta urinilgan',
        logo: 'Sayt logosi',
        about: '«Biz haqimizda» bo‘limi',
        social_links: 'Ijtimoiy tarmoq havolalari',
        telegram_recipients: 'Telegram qabul qiluvchilari',
        active_languages: 'Faol tillar',
        active_currencies: 'Faol valyutalar',
        currencies: 'Valyutalar',
        ACTIVE: 'Faol',
        INACTIVE: 'Nofaol',
        ARCHIVED: 'Arxivlangan',
        DRAFT: 'Qoralama',
        BLOCKED: 'Bloklangan',
        USER: 'Xaridor',
        ADMIN: 'Administrator',
        PHYSICAL: 'Jismoniy mahsulot',
        DIGITAL: 'Raqamli mahsulot',
        SERVICE: 'Xizmat',
        SIGN_UP: 'Ro‘yxatdan o‘tish',
        SIGN_IN: 'Tizimga kirish',
        PASSWORD_RESET: 'Parolni tiklash',
        EMAIL_CHANGE: 'Emailni almashtirish',
        uz: 'O‘zbekcha',
        ru: 'Русский',
        PRODUCT_IMAGE: 'Mahsulot rasmlari',
        CATEGORY_IMAGE: 'Kategoriya rasmlari',
        BRAND_LOGO: 'Brend logolari',
        BRANCH_IMAGE: 'Filial rasmlari',
        USER_AVATAR: 'Foydalanuvchi avatarlari',
        SITE_LOGO: 'Sayt logosi',
      },
    },
    adminAdvertisements: {
      title: 'Reklamalar boshqaruvi',
      subtitle: 'Sayt va ilova uchun reklama bannerlari hamda videolarni yaratish, rejalashtirish va boshqarish.',
      createButton: 'Reklama yaratish',
      refreshButton: 'Yangilash',
      retryButton: 'Qayta urinish',
      checkingPermissions: 'Admin ruxsatlari tekshirilmoqda...',
      userRoleBlockedTitle: 'Bu sahifa faqat administratorlar uchun',
      userRoleBlockedSubtitle: 'Reklamalarni boshqarish uchun ADMIN roliga ega akkaunt bilan kiring.',
      switchAccountButton: 'Boshqa akkauntga kirish',
      backendForbiddenTitle: 'Server ruxsat bermadi',
      backendForbiddenSubtitle: 'Sizning akkauntingizda reklamalarni boshqarish huquqi mavjud emas.',
      backendForbiddenEndpointLabel: 'So‘rov manzili',
      backToStore: 'Katalogga qaytish',
      searchPlaceholder: 'Reklama nomi bo‘yicha qidirish...',
      channelFilterLabel: 'Kanal',
      statusFilterLabel: 'Holat',
      allChannels: 'Barcha kanallar',
      allStatuses: 'Barcha holatlar',
      clearFilters: 'Filtrlarni tozalash',
      emptyTitle: 'Hozircha reklamalar mavjud emas',
      emptyDescription: 'Birinchi reklama qoralamasini yaratish uchun «Reklama yaratish» tugmasini bosing.',
      emptyFilteredTitle: 'Mos reklamalar topilmadi',
      emptyFilteredDescription: 'Qidiruv so‘rovi yoki filtr parametrlarini o‘zgartirib ko‘ring.',
      totalCountSuffix: 'ta reklama',
      channels: {
        WEB: 'Sayt (WEB)',
        APP: 'Ilova (APP)',
      },
      statuses: {
        DRAFT: 'Qoralama',
        PUBLISHED: 'Nashr qilingan',
        PAUSED: 'Pauzada',
        ARCHIVED: 'Arxivlangan',
      },
      visibilities: {
        DRAFT: 'Qoralama',
        SCHEDULED: 'Rejalashtirilgan',
        LIVE: 'Efirda',
        ENDED: 'Tugagan',
        PAUSED: 'Pauzada',
        ARCHIVED: 'Arxivlangan',
      },
      mediaKinds: {
        IMAGE: 'Rasm',
        VIDEO: 'Video',
        NONE: 'Mediasiz',
      },
      columns: {
        title: 'Sarlavha',
        media: 'Media turi',
        channels: 'Kanallar',
        schedule: 'Ko‘rsatish vaqti',
        status: 'Holat',
        updatedAt: 'Yangilangan',
        actions: 'Amallar',
      },
      scheduleUnlimited: 'Cheklanmagan',
      scheduleFromPrefix: 'Dan',
      scheduleToPrefix: 'Gacha',
      editStatusPrefix: 'Holat',
      revisionPrefix: 'Versiya',
      sortOrderLabel: 'Tartib',
      actions: {
        edit: 'Tahrirlash',
        view: 'Ko‘rish',
        history: 'Tarix',
        publish: 'Nashr qilish',
        pause: 'Pauza',
        archive: 'Arxivlash',
      },
      drawer: {
        createTitle: 'Yangi reklama yaratish',
        editTitle: 'Reklamani tahrirlash',
        viewArchivedTitle: 'Arxivlangan reklama (faqat ko‘rish)',
        archivedReadOnlyNotice: 'Arxivlangan reklamani tahrirlab yoki holatini o‘zgartirib bo‘lmaydi.',
        uzSectionTitle: 'O‘zbekcha ma’lumotlar',
        ruSectionTitle: 'Ruscha ma’lumotlar',
        titleLabel: 'Sarlavha',
        titlePlaceholderUz: 'Masalan: Hafta aksiyasi',
        titlePlaceholderRu: 'Masalan: Акция недели',
        descriptionLabel: 'Tavsif (ixtiyoriy)',
        descriptionPlaceholderUz: 'Reklama haqida qisqa yoki batafsil matn...',
        descriptionPlaceholderRu: 'Текст рекламы на русском языке...',
        channelsLabel: 'Ko‘rsatish kanallari',
        channelsHint: 'Kamida bitta kanalni tanlang (sayt yoki mobil ilova).',
        targetUrlLabel: 'Maqsad havola (ixtiyoriy)',
        targetUrlPlaceholder: '/products/choyan-qozon yoki https://example.com',
        targetUrlHint: 'Sayt ichidagi /... yo‘l yoki to‘liq https:// havola kiriting.',
        scheduleSectionTitle: 'Ko‘rsatish jadvali',
        timezoneNoticePrefix: 'Joriy vaqt mintaqasi',
        startsAtLabel: 'Boshlanish vaqti',
        endsAtLabel: 'Tugash vaqti',
        clearDateButton: 'Tozalash',
        utcPreviewPrefix: 'Serverga yuboriladigan UTC vaqt',
        sortOrderLabel: 'Tartib raqami (sortOrder)',
        sortOrderHint: '0 yoki undan katta butun son (kichik raqam oldinroq ko‘rinadi).',
        mediaSectionTitle: 'Media fayl (Rasm yoki Video)',
        mediaHint: 'PNG/JPEG (2 MB va 2048×2048 px gacha) yoki MP4 video (25 MB gacha).',
        selectMediaButton: 'Fayl tanlash',
        changeMediaButton: 'Boshqa fayl tanlash',
        resetSelectedMediaButton: 'Tanlovni bekor qilish',
        currentSavedMediaLabel: 'Joriy saqlangan media',
        newSelectedMediaLabel: 'Yangi tanlangan fayl',
        noMediaNotice: 'Hozircha media biriktirilmagan. Qoralamani mediasiz saqlash mumkin, ammo nashr qilish uchun media kerak.',
        mediaLoadError: 'Media faylni yuklab bo‘lmadi.',
        mediaNotFound: 'Media fayl serverda topilmadi.',
        saveButton: 'Saqlash',
        saveDraftButton: 'Qoralama sifatida saqlash',
        cancelButton: 'Bekor qilish',
        closeButton: 'Yopish',
        conflictBannerTitle: 'Versiya ziddiyati (409)',
        loadLatestVersionButton: 'Yangi versiyani yuklash',
        applyServerValuesButton: 'Server qiymatlarini formaga qo‘yish',
        latestVersionLoadedNotice: 'Serverdagi oxirgi versiya yuklandi; formadagi o‘zgarishlaringiz saqlab qolindi. Endi saqlashni qayta urinib ko‘rishingiz mumkin.',
      },
      validation: {
        uzTitleRequired: 'O‘zbekcha sarlavhani kiriting.',
        uzTitleMax: 'O‘zbekcha sarlavha 160 belgidan oshmasligi kerak.',
        uzDescriptionMax: 'O‘zbekcha tavsif 3000 belgidan oshmasligi kerak.',
        ruTitleRequired: 'Ruscha sarlavhani kiriting.',
        ruTitleMax: 'Ruscha sarlavha 160 belgidan oshmasligi kerak.',
        ruDescriptionMax: 'Ruscha tavsif 3000 belgidan oshmasligi kerak.',
        channelsRequired: 'Kamida bitta kanalni (WEB yoki APP) tanlang.',
        targetUrlInvalid: 'Faqat / bilan boshlanadigan ichki yo‘l yoki https:// havola kiriting.',
        sortOrderInvalid: 'Tartib raqami 0 dan kichik bo‘lmagan butun son bo‘lishi kerak.',
        endsAfterStarts: 'Tugash vaqti boshlanish vaqtidan keyin bo‘lishi kerak.',
        mediaInvalidType: 'Faqat PNG, JPEG rasm yoki MP4 video qabul qilinadi.',
        mediaImageTooLarge: 'Rasm hajmi 2 MB dan oshmasligi kerak.',
        mediaVideoTooLarge: 'Video hajmi 25 MB dan oshmasligi kerak.',
        mediaInvalidDimensions: 'Rasm o‘lchami 2048×2048 px dan oshmasligi kerak.',
        mediaUnreadable: 'Tanlangan media faylni o‘qib bo‘lmadi.',
        publishMediaRequired: 'Reklamani nashr qilish uchun rasm yoki video yuklangan bo‘lishi shart.',
        publishEndsAtPast: 'Tugash vaqti o‘tib ketgan reklamani nashr qilib bo‘lmaydi.',
        reasonMax: 'Izoh 1000 belgidan oshmasligi kerak.',
      },
      archiveModal: {
        title: 'Reklamani arxivlash',
        subtitle: 'Arxivlangan reklama faqat ko‘rish holatiga o‘tadi va keyinchalik tahrirlab bo‘lmaydi.',
        reasonLabel: 'Izoh (ixtiyoriy)',
        reasonPlaceholder: 'Arxivlash sababini kiriting (1000 belgigacha)...',
        confirmButton: 'Arxivlashni tasdiqlash',
        cancelButton: 'Bekor qilish',
      },
      history: {
        title: 'O‘zgarishlar tarixi',
        subtitle: 'Har bir saqlash va holat o‘zgarishi bo‘yicha versiyalar jurnali.',
        emptyTitle: 'Tarix yozuvlari topilmadi',
        emptyDescription: 'Ushbu reklama bo‘yicha hali tarix yozuvlari mavjud emas.',
        actorLabel: 'Bajaruvchi',
        systemActor: 'Tizim',
        reasonLabel: 'Izoh',
        viewVersionButton: 'Versiyani ko‘rish',
        snapshotModalTitle: 'Versiya tafsilotlari',
        channelsLabel: 'Kanallar',
        targetUrlLabel: 'Maqsad havola',
        scheduleLabel: 'Ko‘rsatish vaqti',
        sortOrderLabel: 'Tartib raqami',
        statusLabel: 'Holat',
        mediaLabel: 'Media',
        noMediaInVersion: 'Bu versiyada media biriktirilmagan',
        actions: {
          CREATED: 'Yaratildi',
          UPDATED: 'Tahrirlandi',
          PUBLISHED: 'Nashr qilindi',
          PAUSED: 'Pauzaga qo‘yildi',
          ARCHIVED: 'Arxivlandi',
          STATUS_CHANGED: 'Holat o‘zgartirildi',
        },
      },
      notifications: {
        createdSuccess: 'Reklama qoralamasi yaratildi',
        updatedSuccess: 'Reklama o‘zgarishlari saqlandi',
        publishedSuccess: 'Reklama nashr qilindi',
        pausedSuccess: 'Reklama pauzaga qo‘yildi',
        archivedSuccess: 'Reklama arxivlandi',
        loadDetailError: 'Reklama ma’lumotlarini yuklab bo‘lmadi.',
        notFoundError: 'Reklama topilmadi.',
      },
    },
  },
  ru: {
    brandName: 'Oson Market',
    pageTitle: 'Oson Market — Вход и профиль',
    languageLabel: 'Выберите язык',
    heroTitle: 'Ежедневные покупки с Oson Market ещё удобнее',
    heroSubtitle:
      'Тысячи качественных товаров, быстрая доставка и удобные способы оплаты в одном месте.',
    heroSteps: [
      {
        title: 'Широкий ассортимент',
        description: 'Большой выбор электроники, товаров для дома и повседневных покупок.',
      },
      {
        title: 'Быстрая доставка',
        description: 'Доставляем заказы в короткие сроки до двери или ближайшего пункта выдачи.',
      },
      {
        title: 'Удобное управление',
        description: 'Сохраняйте избранные товары и отслеживайте статус доставки в любой момент.',
      },
    ],
    heroImageAlt: 'Современный сервис и пространство Oson Market',
    tabs: {
      signIn: 'Вход',
      signUp: 'Регистрация',
      forgotPassword: 'Сброс пароля',
    },
    signIn: {
      heading: 'Вход в аккаунт',
      subheading: 'Введите username или email и пароль. Код подтверждения придёт на вашу почту.',
      loginLabel: 'Username или Email',
      loginPlaceholder: 'buyer_01 или buyer@example.com',
      passwordLabel: 'Пароль',
      passwordPlaceholder: 'Введите пароль',
      forgotLink: 'Забыли пароль?',
      submit: 'Получить код подтверждения',
      orDivider: 'или',
      googleButton: 'Войти через Google',
    },
    signUp: {
      heading: 'Создать новый аккаунт',
      subheading: 'Заполните данные для создания профиля в Oson Market.',
      firstNameLabel: 'Имя',
      firstNamePlaceholder: 'Зафар',
      lastNameLabel: 'Фамилия',
      lastNamePlaceholder: 'Зиятов',
      emailLabel: 'Электронная почта',
      emailPlaceholder: 'buyer@example.com',
      usernameLabel: 'Имя пользователя',
      usernamePlaceholder: 'buyer_01',
      usernameHelp: '3–64 символа: латинские буквы, цифры или нижнее подчёркивание (_)',
      passwordLabel: 'Пароль',
      passwordPlaceholder: 'Минимум 8 символов',
      passwordHelp: 'От 8 до 72 символов (до 72 байт в UTF-8)',
      confirmPasswordLabel: 'Подтвердите пароль',
      confirmPasswordPlaceholder: 'Повторите пароль',
      submit: 'Продолжить регистрацию',
    },
    forgotPassword: {
      heading: 'Восстановление пароля',
      subheading: 'Укажите электронную почту аккаунта, чтобы получить код для смены пароля.',
      emailLabel: 'Электронная почта',
      emailPlaceholder: 'buyer@example.com',
      submit: 'Отправить код',
      backToSignIn: 'Вернуться ко входу',
    },
    otp: {
      step1Label: 'Данные',
      step2Label: 'Подтверждение',
      verifyHeadingSignIn: 'Подтвердите вход',
      verifyHeadingSignUp: 'Подтвердите аккаунт',
      verifyHeadingReset: 'Установите новый пароль',
      codeSentTo: 'Код отправлен на',
      codeLabel: '6-значный код подтверждения',
      codeHelp: 'Введите 6 цифр, сохраняя ведущие нули (например: 004321).',
      newPasswordLabel: 'Новый пароль',
      newPasswordPlaceholder: 'Введите новый надёжный пароль',
      confirmNewPasswordLabel: 'Подтвердите новый пароль',
      confirmNewPasswordPlaceholder: 'Повторите новый пароль',
      validityLabel: 'Код действителен',
      expiredNotice: 'Срок действия кода мог истечь. Запросите новый код.',
      attemptsRemaining: 'Осталось попыток',
      attemptsExhausted: 'Лимит неверных попыток исчерпан. Запросите новый код.',
      resendButton: 'Запросить новый код',
      resendCooldown: 'Повторно через',
      verifySubmit: 'Подтвердить и войти',
      resetSubmit: 'Обновить пароль',
      changeDetails: 'Назад',
    },
    validation: {
      requiredFirstName: 'Введите имя',
      firstNameMaxLength: 'Имя не должно превышать 100 символов',
      requiredLastName: 'Введите фамилию',
      lastNameMaxLength: 'Фамилия не должна превышать 100 символов',
      requiredEmail: 'Введите электронную почту',
      invalidEmail: 'Введите корректный адрес электронной почты',
      requiredLogin: 'Введите username или email',
      requiredUsername: 'Введите имя пользователя',
      invalidUsername: 'Допустимы 3–64 символа: латиница, цифры или _',
      requiredPassword: 'Введите пароль',
      passwordMinLength: 'Пароль должен содержать минимум 8 символов',
      passwordMaxLength: 'Пароль не должен превышать 72 символа',
      passwordMaxBytes: 'Пароль не должен превышать 72 байта',
      requiredConfirmPassword: 'Подтвердите пароль',
      passwordsDoNotMatch: 'Пароли не совпадают',
      newPasswordSameAsCurrent: 'Новый пароль должен отличаться от текущего',
      requiredPhone: 'Введите номер телефона',
      invalidPhone: 'Номер должен начинаться с цифры или + (допустимы цифры, пробелы, скобки и дефисы)',
      phoneMaxLength: 'Номер телефона не должен превышать 32 символа',
      avatarInvalidType: 'Загрузите изображение в формате PNG или JPEG',
      avatarTooLarge: 'Размер изображения не должен превышать 2 МБ',
      avatarInvalidDimensions: 'Размеры изображения не должны превышать 2048×2048 пикселей',
      avatarReadError: 'Не удалось прочитать файл изображения',
      humanCheckRequired: 'Подтвердите, что вы не робот',
      requiredOtp: 'Введите 6-значный код',
      invalidOtp: 'Код должен состоять ровно из 6 цифр',
    },
    humanCheck: {
      checkboxLabel: 'Я не робот',
      verifiedLabel: 'Проверено: вы не робот',
      badgeLabel: 'Защита',
      promptLabel: 'Выберите правильный ответ для проверки:',
      refreshLabel: 'Обновить пример',
      wrongAnswer: 'Неверный ответ, попробуйте снова',
      canvasAlt: 'Проверочный пример',
    },
    notifications: {
      sessionExpired: 'Срок действия сессии истёк. Войдите снова.',
      unauthorizedCleared: 'Сессия недействительна. Пожалуйста, войдите снова.',
      signedInSuccess: 'Вы успешно вошли в аккаунт.',
      signedUpSuccess: 'Аккаунт успешно создан.',
      passwordResetSuccess: 'Пароль обновлён. Теперь вы можете войти с новым паролем.',
      loggedOut: 'Вы вышли из аккаунта.',
      profileRefreshed: 'Данные профиля обновлены.',
    },
    googleCallback: {
      loadingTitle: 'Выполняется вход через Google...',
      loadingSubtitle: 'Проверяем ваш аккаунт, пожалуйста подождите.',
      errorTitle: 'Не удалось завершить вход через Google',
      conflictError: 'Войдите в этот аккаунт обычным способом',
      unverifiedError: 'Подтвердите email в вашем аккаунте Google',
      failedError: 'Не удалось выполнить вход через Google',
      missingCodeError: 'Не удалось выполнить вход через Google',
      expiredOrInvalidCodeError: 'Срок входа истёк. Начните новый вход через Google.',
      unauthorizedProfileError: 'Сессия недействительна. Пожалуйста, войдите снова.',
      backToLogin: 'Вернуться ко входу',
      startNewGoogleLogin: 'Начать новый вход через Google',
    },
    workspace: {
      menuStore: 'Магазин',
      menuMyOrders: 'Мои заказы',
      menuCategories: 'Категории',
      menuBrands: 'Бренды',
      menuBranches: 'Филиалы',
      menuProducts: 'Товары',
      menuAdminOrders: 'Заказы',
      menuTelegramRecipients: 'Telegram-уведомления',
      menuSiteLogo: 'Логотип сайта',
      menuSiteAbout: 'О нас',
      menuAdminUsers: 'Пользователи',
      menuAdminStatistics: 'Статистика',
      menuAdminAdvertisements: 'Реклама',
      header: {
        moreButton: 'Ещё',
        moreMenuAriaLabel: 'Дополнительные разделы меню',
        openMenuAriaLabel: 'Открыть меню навигации',
        closeMenuAriaLabel: 'Закрыть меню навигации',
        homeAriaLabel: 'Главная страница Oson Market',
        adminNavAriaLabel: 'Разделы панели администратора',
        adminSectionLabel: 'Администрирование',
        languageSwitchAriaLabel: 'Переключить язык',
      },
      menuProfile: 'Мой профиль',
      menuSecurity: 'Безопасность',
      breadcrumbRoot: 'Oson Market',
      logoutButton: 'Выйти',
      refreshProfile: 'Обновить',
      retryButton: 'Повторить',
      checkingProfile: 'Проверяем данные профиля...',
      profileTitle: 'Личные данные',
      profileSubtitle: 'Основные сведения вашего аккаунта',
      notProvided: 'Не указано',
      fields: {
        email: 'Электронная почта',
        username: 'Имя пользователя',
        role: 'Тип аккаунта',
        language: 'Язык интерфейса',
        firstName: 'Имя',
        lastName: 'Фамилия',
        phone: 'Телефон',
        emailVerified: 'Статус почты',
        createdAt: 'Дата регистрации',
        updatedAt: 'Последнее обновление',
      },
      roleNames: {
        USER: 'Покупатель',
        ADMIN: 'Администратор',
      },
      languageNames: {
        uz: 'O‘zbekcha',
        ru: 'Русский',
      },
      avatar: {
        uploadButton: 'Загрузить фото',
        replaceButton: 'Заменить фото',
        deleteButton: 'Удалить',
        hint: 'PNG или JPEG, до 2 МБ и до 2048×2048 px',
        uploadedSuccess: 'Фото профиля обновлено.',
        deletedSuccess: 'Фото профиля удалено.',
        alt: 'Фото профиля',
      },
      personalForm: {
        title: 'Редактирование личных данных',
        subtitle: 'Укажите имя, фамилию и контактный номер телефона',
        firstNamePlaceholder: 'Введите имя',
        lastNamePlaceholder: 'Введите фамилию',
        phoneLabel: 'Телефон',
        phonePlaceholder: '+998 90 123-45-67',
        phoneHelp: 'Начинается с цифры или + (цифры, пробелы, скобки и дефис)',
        clearNote: 'Если оставить поле пустым, сохранённое значение будет очищено.',
        saveButton: 'Сохранить данные',
        resetButton: 'Отменить',
        savedSuccess: 'Личные данные сохранены.',
      },
      usernameForm: {
        title: 'Имя пользователя',
        subtitle: 'Уникальный логин для входа в аккаунт',
        label: 'Новое имя пользователя',
        placeholder: 'yangi_user',
        help: '3–64 символа: латинские буквы, цифры или нижнее подчёркивание (_)',
        nextLoginNote: 'При следующем входе используйте новое имя пользователя.',
        saveButton: 'Сохранить имя',
        savedSuccess: 'Имя пользователя обновлено.',
      },
      languageForm: {
        title: 'Язык интерфейса и уведомлений',
        subtitle: 'Выбранный язык сохраняется в вашем профиле',
        label: 'Основной язык',
        saveButton: 'Сохранить язык',
        savedSuccess: 'Язык профиля сохранён.',
      },
      emailChange: {
        title: 'Изменение электронной почты',
        subtitle: 'Подтвердите новый адрес текущим паролем и одноразовым кодом',
        currentEmailLabel: 'Текущая почта',
        newEmailLabel: 'Новая электронная почта',
        newEmailPlaceholder: 'newbuyer@example.com',
        currentPasswordLabel: 'Текущий пароль',
        currentPasswordPlaceholder: 'Введите текущий пароль',
        sendCodeButton: 'Отправить код подтверждения',
        verifyHeading: 'Подтвердите новую почту',
        verifySubtitle: 'Код отправлен на',
        codeSentNotice: 'Текущий адрес сохраняется до завершения подтверждения.',
        verifyButton: 'Подтвердить email',
        cancelButton: 'Назад',
        reloginNote: 'После смены почты потребуется войти заново с новым адресом.',
      },
      passwordChange: {
        title: 'Изменение пароля',
        subtitle: 'Введите текущий пароль и задайте новый надёжный пароль',
        currentPasswordLabel: 'Текущий пароль',
        currentPasswordPlaceholder: 'Введите текущий пароль',
        newPasswordLabel: 'Новый пароль',
        newPasswordPlaceholder: 'Минимум 8 символов',
        confirmNewPasswordLabel: 'Подтвердите новый пароль',
        confirmNewPasswordPlaceholder: 'Повторите новый пароль',
        googleAccountNote:
          'Если аккаунт создан через Google и пароль ещё не задан, выйдите и создайте пароль через «Забыли пароль?». После смены пароля потребуется повторный вход.',
        saveButton: 'Обновить пароль',
      },
      sessionCardTitle: 'Активная сессия',
      sessionExpiresIn: 'До завершения сессии',
      sessionPolicyNote:
        'Пока вы активны, токен доступа автоматически обновляется в фоне. При смене пароля или почты прежние сессии закрываются.',
      googleInfoTitle: 'Вход через Google',
      googleInfoBody:
        'Вы также можете быстро и безопасно входить в свой профиль с помощью аккаунта Google.',
      verifiedStatus: 'Подтверждён',
      unverifiedStatus: 'Не подтверждён',
      profileCompletion: {
        title: 'Заполните профиль',
        missingPrefix: 'Для продолжения укажите ',
        missingSuffix: '.',
        fieldLabels: {
          firstName: 'имя',
          lastName: 'фамилию',
          phone: 'номер телефона',
        },
        phoneHelp: 'В международном формате (например: +998 90 123-45-67)',
        submitButton: 'Сохранить и начать покупки',
        savedSuccess: 'Профиль сохранён. Приятных покупок!',
      },
      storeHome: {
        welcomeTitle: 'Добро пожаловать в онлайн-магазин Oson Market',
        welcomeSubtitle:
          'Ваш профиль полностью заполнен. Аккаунт готов к оформлению покупок и заказов.',
        readyBannerTitle: 'Каталог товаров скоро появится на этой странице',
        readyBannerSubtitle:
          'Сейчас вы можете управлять личными данными, номером телефона и настройками безопасности.',
        openProfileTitle: 'Мой профиль и контакты',
        openProfileDesc: 'Редактируйте имя, фамилию, телефон, фото профиля и язык интерфейса.',
        openProfileAction: 'Открыть профиль',
        openSecurityTitle: 'Безопасность аккаунта',
        openSecurityDesc: 'Управляйте электронной почтой, паролем и активными сессиями.',
        openSecurityAction: 'Раздел безопасности',
        openCategoriesTitle: 'Управление категориями',
        openCategoriesDesc: 'Создавайте, редактируйте и настраивайте активность категорий каталога.',
        openCategoriesAction: 'Открыть категории',
        openBrandsTitle: 'Управление брендами',
        openBrandsDesc: 'Добавляйте бренды, загружайте логотипы и управляйте их активностью.',
        openBrandsAction: 'Открыть бренды',
        openProductsTitle: 'Управление товарами',
        openProductsDesc: 'Создавайте товары, варианты (SKU) и галереи изображений в одной форме.',
        openProductsAction: 'Открыть товары',
      },
    },
    adminCategories: {
      title: 'Управление категориями',
      subtitle: 'Создавайте и упорядочивайте категории каталога на узбекском и русском языках',
      createButton: 'Добавить категорию',
      refreshButton: 'Обновить',
      totalCountLabel: 'Всего',
      rootCategory: 'Корневая категория',
      missingTranslation: 'Перевод не указан',
      activeLabel: 'Активна',
      inactiveLabel: 'Неактивна',
      incompleteToggleNotice:
        'Чтобы изменить статус активности, сначала заполните названия на узбекском и русском языках.',
      checkingPermissions: 'Проверяем права администратора...',
      forbiddenTitle: 'Доступ ограничен',
      forbiddenSubtitle: 'Для управления категориями требуются права администратора.',
      userRoleBlockedTitle: 'Требуется вход с аккаунтом ADMIN',
      userRoleBlockedSubtitle:
        'Управление категориями доступно только администраторам. Текущая роль вашего профиля: USER.',
      switchAccountButton: 'Войти как ADMIN',
      backendForbiddenTitle: 'Сервер отклонил запрос (403)',
      backendForbiddenSubtitle:
        'Ваш профиль имеет роль ADMIN, однако backend вернул ошибку доступа 403 для этого запроса.',
      backendForbiddenEndpointLabel: 'Отклонённый endpoint',
      emptyTitle: 'Категорий пока нет',
      emptyDescription: 'Добавьте первую категорию для каталога магазина.',
      sortOrderShortLabel: 'Порядок',
      backToStore: 'Вернуться в магазин',
      notFoundError: 'Категория не найдена или уже удалена.',
      columns: {
        uzName: 'Название (UZ)',
        ruName: 'Название (RU)',
        slug: 'Slug',
        parent: 'Родительская категория',
        sortOrder: 'Порядок',
        status: 'Статус',
        actions: 'Действия',
      },
      actions: {
        edit: 'Изменить',
        delete: 'Удалить',
        viewProducts: 'Товары',
        addProduct: 'Добавить товар',
        deleteConfirmTitle: 'Удалить категорию?',
        deleteConfirmDescription:
          'Если к категории привязаны подкатегории или товары, удаление не выполнится.',
        deleteConfirmOk: 'Да, удалить',
        deleteConfirmCancel: 'Отмена',
      },
      form: {
        createTitle: 'Новая категория',
        editTitle: 'Редактирование категории',
        loadingCategory: 'Загрузка данных категории...',
        generalSection: 'Основные параметры',
        slugLabel: 'Slug',
        slugPlaceholder: 'telefonlar',
        slugGenerate: 'Из названия',
        parentLabel: 'Родительская категория',
        parentPlaceholder: 'Корневая категория (без родителя)',
        sortOrderLabel: 'Порядок сортировки',
        imageLabel: 'Изображение категории (необязательно)',
        selectImageButton: 'Выбрать фото',
        replaceImageButton: 'Заменить',
        removeImageButton: 'Удалить',
        imageHint: 'PNG или JPEG, до 2 МБ и до 2048×2048 px',
        imageAlt: 'Изображение категории',
        activeLabel: 'Активная категория',
        uzSection: 'Данные на узбекском (UZ)',
        ruSection: 'Данные на русском (RU)',
        nameLabel: 'Название',
        namePlaceholderUz: 'Telefonlar',
        namePlaceholderRu: 'Телефоны',
        descriptionLabel: 'Описание',
        descriptionPlaceholder: 'Краткое описание категории (необязательно)',
        seoTitleLabel: 'SEO заголовок',
        seoTitlePlaceholder: 'SEO заголовок (необязательно)',
        seoDescriptionLabel: 'SEO описание',
        seoDescriptionPlaceholder: 'SEO описание (необязательно)',
        saveCreate: 'Создать категорию',
        saveUpdate: 'Сохранить изменения',
        cancel: 'Отмена',
      },
      validation: {
        requiredSlug: 'Введите slug',
        slugMaxLength: 'Slug не должен превышать 160 символов',
        requiredName: 'Введите название категории',
        nameMaxLength: 'Название не должно превышать 200 символов',
        seoTitleMaxLength: 'SEO заголовок не должен превышать 255 символов',
        invalidUuid: 'Выберите корректное значение',
        sortOrderMin: 'Порядок сортировки должен быть 0 или больше',
        imageInvalidType: 'Выберите изображение в формате PNG или JPEG',
        imageTooLarge: 'Размер изображения не должен превышать 2 МБ',
        imageInvalidDimensions: 'Размеры изображения не должны превышать 2048×2048 пикселей',
        imageReadError: 'Не удалось открыть выбранный файл изображения',
      },
      notifications: {
        createdSuccess: 'Категория успешно создана.',
        updatedSuccess: 'Категория обновлена.',
        statusUpdatedSuccess: 'Статус категории обновлён.',
        deletedSuccess: 'Категория удалена.',
      },
    },
    adminProducts: {
      title: 'Управление товарами',
      subtitle: 'Управляйте товарами, вариантами и изображениями по категориям и брендам',
      createButton: 'Добавить товар',
      refreshButton: 'Обновить',
      totalCountLabel: 'Всего',
      filterByCategoryLabel: 'Фильтр по категории',
      allCategoriesOption: 'Все категории',
      noCategory: 'Без категории',
      noBrand: 'Без бренда',
      checkingPermissions: 'Проверяем права администратора...',
      userRoleBlockedTitle: 'Требуется вход с аккаунтом ADMIN',
      userRoleBlockedSubtitle:
        'Управление товарами доступно только администраторам. Текущая роль вашего профиля: USER.',
      switchAccountButton: 'Войти как ADMIN',
      backendForbiddenTitle: 'Сервер отклонил запрос (403)',
      backendForbiddenSubtitle:
        'Ваш профиль имеет роль ADMIN, однако backend вернул ошибку доступа 403 для этого запроса.',
      backendForbiddenEndpointLabel: 'Отклонённый endpoint',
      emptyTitle: 'Товаров пока нет',
      emptyDescription: 'Добавьте первый товар и его варианты в каталог магазина.',
      emptyFilteredDescription: 'В выбранной категории пока нет товаров.',
      backToStore: 'Вернуться в магазин',
      notFoundError: 'Товар не найден или уже удалён.',
      warrantyMonthsSuffix: 'мес.',
      statusNames: {
        DRAFT: 'Черновик',
        ACTIVE: 'Активный',
        ARCHIVED: 'В архиве',
      },
      variantStatusNames: {
        ACTIVE: 'Активный',
        INACTIVE: 'Неактивный',
        DRAFT: 'Черновик',
      },
      columns: {
        productName: 'Название товара',
        slug: 'Slug',
        brand: 'Бренд',
        categories: 'Категории',
        productKind: 'Тип',
        warranty: 'Гарантия',
        status: 'Статус',
        actions: 'Действия',
      },
      actions: {
        viewDetails: 'Подробнее',
        edit: 'Изменить',
        delete: 'Удалить',
        deleteConfirmTitle: 'Удалить товар?',
        deleteConfirmDescription:
          'Если товар связан с заказами или другими записями, удаление не выполнится.',
        deleteConfirmOk: 'Да, удалить',
        deleteConfirmCancel: 'Отмена',
      },
      form: {
        createTitle: 'Новый товар',
        editTitle: 'Редактирование товара',
        loadingProduct: 'Загрузка данных товара и вариантов...',
        productSection: 'Основные данные товара',
        slugLabel: 'Slug',
        slugPlaceholder: 'iphone-15-pro',
        slugGenerate: 'Из названия',
        brandLabel: 'Бренд',
        brandPlaceholder: 'Выберите бренд (необязательно)',
        categoriesLabel: 'Категории',
        categoriesPlaceholder: 'Выберите одну или несколько категорий',
        statusLabel: 'Статус',
        productKindLabel: 'Тип товара',
        productKindPlaceholder: 'Например: PHYSICAL (необязательно)',
        warrantyMonthsLabel: 'Гарантия (мес.)',
        warrantyMonthsPlaceholder: '12',
        uzSection: 'Тексты на узбекском (UZ)',
        ruSection: 'Тексты на русском (RU)',
        titleLabel: 'Название',
        titlePlaceholderUz: 'Apple iPhone 15 Pro',
        titlePlaceholderRu: 'Apple iPhone 15 Pro',
        shortDescriptionLabel: 'Краткое описание',
        shortDescriptionPlaceholder: 'Краткое описание товара (необязательно)',
        descriptionLabel: 'Полное описание',
        descriptionPlaceholder: 'Подробное описание (необязательно)',
        seoTitleLabel: 'SEO заголовок',
        seoTitlePlaceholder: 'SEO заголовок (необязательно)',
        seoDescriptionLabel: 'SEO описание',
        seoDescriptionPlaceholder: 'SEO описание (необязательно)',
        variantsSection: 'Варианты',
        variantsLimitHint: 'Минимум 1, максимум 100 вариантов',
        addVariantButton: 'Добавить вариант',
        variantCardTitle: 'Вариант',
        removeVariantButton: 'Удалить вариант',
        skuLabel: 'SKU',
        skuPlaceholder: 'IP15P-256-BLK',
        barcodeLabel: 'Штрих-код (Barcode)',
        barcodePlaceholder: '460000000001',
        variantStatusLabel: 'Статус варианта',
        variantStatusPlaceholder: 'Выберите статус',
        defaultTypeLabel: 'Вариант по умолчанию',
        defaultTypeActive: 'По умолчанию',
        defaultTypeMakeDefault: 'Сделать основным',
        regularPriceLabel: 'Обычная цена (UZS)',
        regularPricePlaceholder: '150000',
        salePriceLabel: 'Цена со скидкой (UZS, необязательно)',
        salePricePlaceholder: '129000',
        priceSectionHint: 'Цена должна быть положительной, не более 2 знаков после запятой',
        dimensionsOptionalTitle: 'Габариты и вес (необязательно)',
        weightGramsLabel: 'Вес (г)',
        lengthMmLabel: 'Длина (мм)',
        widthMmLabel: 'Ширина (мм)',
        heightMmLabel: 'Высота (мм)',
        imagesSectionLabel: 'Изображения варианта',
        selectImagesButton: 'Выбрать фото',
        imagesHint: 'PNG/JPEG, до 2 МБ и 2048×2048 px · до 20 фото на вариант · до 12 новых файлов за сохранение',
        noImagesYet: 'Изображения ещё не выбраны',
        replaceImageButton: 'Заменить',
        removeImageButton: 'Удалить',
        moveImageUp: 'Влево',
        moveImageDown: 'Вправо',
        primaryImageLabel: 'Главное фото',
        setPrimaryImageButton: 'Сделать главным',
        sortOrderLabel: 'Порядок',
        imageAlt: 'Изображение варианта',
        saveCreate: 'Сохранить',
        saveUpdate: 'Сохранить',
        cancel: 'Отмена',
      },
      validation: {
        requiredSlug: 'Введите slug товара',
        slugMaxLength: 'Slug не должен превышать 160 символов',
        requiredCategories: 'Выберите хотя бы одну категорию',
        variantsRequired: 'Должен быть хотя бы один вариант товара',
        variantsMaxLimit: 'В одном товаре допускается не более 100 вариантов',
        requiredSku: 'Введите SKU варианта',
        skuMaxLength: 'SKU не должен превышать 120 символов',
        titleRequiredAnyLang: 'Укажите название товара хотя бы на одном языке (UZ или RU)',
        pricePositive: 'Цена должна быть положительным числом больше 0',
        priceDecimals: 'Допускается не более двух знаков после запятой',
        regularRequiredForSale: 'Чтобы указать цену со скидкой, сначала введите обычную цену',
        saleLessThanRegular: 'Цена со скидкой должна быть меньше обычной цены',
        warrantyInvalid: 'Срок гарантии должен быть целым числом 0 или больше',
        nonNegativeInteger: 'Введите целое число 0 или больше',
        imagesPerVariantLimit: 'К одному варианту можно прикрепить до 20 изображений',
        uploadFilesTotalLimit: 'За одно сохранение можно отправить до 12 новых или заменённых файлов',
        imageInvalidType: 'Выберите изображения только в формате PNG или JPEG',
        imageTooLarge: 'Размер каждого изображения не должен превышать 2 МБ',
        imageInvalidDimensions: 'Размеры изображения не должны превышать 2048×2048 пикселей',
        imageReadError: 'Не удалось прочитать выбранный файл изображения',
        conflictError: 'Такой slug или SKU уже занят, либо товар связан с другими записями.',
        payloadTooLargeError: 'Размер загружаемых файлов превышает лимит. Уменьшите количество или размер фото.',
        unsupportedMediaError: 'Неверный формат запроса (ожидается multipart/form-data и product в JSON).',
      },
      notifications: {
        createdSuccess: 'Товар успешно создан.',
        updatedSuccess: 'Товар и варианты сохранены.',
        deletedSuccess: 'Товар удалён.',
      },
      detail: {
        backToList: 'К списку товаров',
        editProductButton: 'Редактировать товар',
        loadingTitle: 'Загрузка сведений о товаре...',
        metadataTitle: 'Основные сведения и даты',
        createdAtLabel: 'Создан',
        updatedAtLabel: 'Обновлён',
        publishedAtLabel: 'Опубликован',
        uzContentTitle: 'Контент на узбекском (UZ)',
        ruContentTitle: 'Контент на русском (RU)',
        titleLabel: 'Название',
        shortDescriptionLabel: 'Краткое описание',
        descriptionLabel: 'Полное описание',
        seoTitleLabel: 'SEO заголовок',
        seoDescriptionLabel: 'SEO описание',
        emptyField: '—',
        missingTranslationNotice: 'Для этого языка данные не заполнены',
        variantsTitle: 'Варианты товара',
        variantsCountLabel: 'Количество вариантов',
        emptyVariantsTitle: 'Вариантов больше не осталось',
        emptyVariantsSubtitle:
          'У этого товара сейчас нет вариантов. Добавьте новый вариант для следующего сохранения.',
        addNewVariantButton: 'Добавить вариант',
        barcodeLabel: 'Штрих-код',
        variantStatusLabel: 'Статус',
        defaultVariantBadge: 'Основной вариант',
        priceLabel: 'Цена',
        regularPriceLabel: 'Обычная цена',
        salePriceLabel: 'Цена со скидкой',
        noPrice: 'Цена не указана',
        weightLabel: 'Вес',
        dimensionsLabel: 'Габариты (Д × Ш × В)',
        noDimensions: 'Не указаны',
        galleryTitle: 'Галерея изображений',
        noImages: 'Изображения для этого варианта не загружены',
        primaryImageBadge: 'Главное фото',
        sortOrderLabel: 'Порядок',
        editVariantButton: 'Редактировать',
        deleteVariantButton: 'Удалить',
        deleteVariantConfirmTitle: 'Удалить вариант?',
        deleteVariantConfirmDescription:
          'При удалении варианта связанные с ним изображения также будут откреплены от товара.',
        editImageButton: 'Редактировать',
        deleteImageButton: 'Удалить',
        deleteImageConfirmTitle: 'Удалить изображение?',
        deleteImageConfirmDescription: 'Это изображение будет удалено из варианта товара.',
        deleteConfirmOk: 'Да, удалить',
        deleteConfirmCancel: 'Отмена',
        variantDeletedSuccess: 'Вариант успешно удалён.',
        imageDeletedSuccess: 'Изображение успешно удалено.',
      },
    },
    adminBrands: {
      title: 'Управление брендами',
      subtitle: 'Управляйте брендами, логотипами и активностью для каталога Oson Market',
      createButton: 'Добавить бренд',
      refreshButton: 'Обновить',
      totalCountLabel: 'Всего',
      searchPlaceholder: 'Поиск по названию или slug...',
      statusFilterLabel: 'Статус',
      statusFilterAll: 'Все',
      statusFilterActive: 'Активные',
      statusFilterInactive: 'Неактивные',
      clearFilters: 'Сбросить фильтры',
      activeLabel: 'Активен',
      inactiveLabel: 'Неактивен',
      checkingPermissions: 'Проверка прав администратора...',
      userRoleBlockedTitle: 'Требуется вход с аккаунтом ADMIN',
      userRoleBlockedSubtitle:
        'Управление брендами доступно только администраторам. Роль текущего аккаунта: USER.',
      switchAccountButton: 'Войти в аккаунт ADMIN',
      backendForbiddenTitle: 'Сервер отклонил доступ (403)',
      backendForbiddenSubtitle:
        'Хотя ваш профиль вернул роль ADMIN, сервер вернул ошибку доступа 403 для этого эндпоинта.',
      backendForbiddenEndpointLabel: 'Отклонённый эндпоинт',
      emptyTitle: 'Брендов пока нет',
      emptyDescription: 'Добавьте первый бренд для привязки к товарам каталога.',
      emptyFilteredDescription: 'По заданному поиску или фильтру бренды не найдены.',
      backToStore: 'Вернуться в магазин',
      notFoundError: 'Бренд не найден или был удалён.',
      columns: {
        brand: 'Бренд',
        slug: 'Slug',
        status: 'Статус',
        actions: 'Действия',
      },
      actions: {
        view: 'Подробнее',
        edit: 'Редактировать',
        delete: 'Удалить',
        deleteConfirmTitle: 'Удалить бренд?',
        deleteConfirmDescription:
          'Если с этим брендом связаны товары, удаление не будет выполнено.',
        deleteConfirmOk: 'Да, удалить',
        deleteConfirmCancel: 'Отмена',
      },
      messages: {
        createdSuccess: 'Бренд успешно создан.',
        updatedSuccess: 'Данные бренда обновлены.',
        deletedSuccess: 'Бренд удалён.',
        statusUpdatedSuccess: 'Статус бренда обновлён.',
      },
      form: {
        createTitle: 'Добавить бренд',
        editTitle: 'Редактировать бренд',
        nameLabel: 'Название бренда',
        namePlaceholder: 'Например: Samsung',
        slugLabel: 'Slug',
        slugPlaceholder: 'samsung',
        generateSlugButton: 'Создать из названия',
        slugHelp: 'Латинские буквы, цифры и дефис (-)',
        activeLabel: 'Статус',
        activeHint: 'Активные бренды доступны при создании товаров',
        logoLabel: 'Логотип бренда (необязательно)',
        logoPickButton: 'Выбрать логотип',
        logoReplaceButton: 'Заменить',
        logoRemoveButton: 'Удалить',
        logoHint: 'PNG или JPEG, до 2 МБ и 2048×2048 px',
        logoPreviewAlt: 'Логотип бренда',
        logoEmptyText: 'Логотип не загружен',
        saveButton: 'Сохранить',
        cancelButton: 'Отмена',
      },
      detail: {
        title: 'Информация о бренде',
        nameLabel: 'Название бренда',
        slugLabel: 'Slug',
        statusLabel: 'Статус активности',
        logoLabel: 'Логотип',
        noLogo: 'Логотип не прикреплён',
        editButton: 'Редактировать',
        deleteButton: 'Удалить',
      },
      validation: {
        nameRequired: 'Введите название бренда',
        nameTooLong: 'Название бренда не должно превышать 180 символов',
        slugRequired: 'Введите slug',
        slugTooLong: 'Slug не должен превышать 120 символов',
        logoInvalidType: 'Допустимы только изображения PNG или JPEG',
        logoTooLarge: 'Размер логотипа не должен превышать 2 МБ',
        logoInvalidDimensions: 'Размеры изображения не должны превышать 2048×2048 px',
        logoReadError: 'Не удалось прочитать выбранное изображение',
      },
    },
    catalog: {
      navCatalog: 'Товары',
      navBranches: 'Филиалы',
      navAbout: 'О нас',
      navSignIn: 'Войти',
      heroHeading: 'Товары Oson Market',
      heroSubtitle:
        'Ищите по категориям, сравнивайте характеристики и варианты и выбирайте нужный товар.',
      searchPlaceholder: 'Поиск по названию, бренду или SKU...',
      allCategories: 'Все товары',
      uncategorizedLabel: 'Товары без категории',
      subcategoriesLabel: 'Подкатегории',
      productsCountSuffix: 'товаров',
      categoriesCountSuffix: 'категорий',
      viewProduct: 'Подробнее',
      noImageLabel: 'Нет изображения',
      variantCountSingle: 'вариант',
      variantCountPlural: 'вариантов',
      skuPrefix: 'SKU',
      warrantyPrefix: 'Гарантия',
      warrantyMonthsSuffix: 'мес.',
      emptyTitle: 'В каталоге пока нет товаров',
      emptyDescription: 'Новые товары скоро появятся в каталоге.',
      emptyFilteredTitle: 'Подходящие товары не найдены',
      emptyFilteredDescription:
        'По выбранной категории или поисковому запросу товары не найдены.',
      clearFilters: 'Сбросить фильтры',
      retryButton: 'Повторить',
      loadingLabel: 'Загрузка каталога...',
      productNotFoundTitle: 'Товар не найден',
      productNotFoundSubtitle:
        'Запрошенный товар отсутствует в каталоге или снят с публикации.',
      backToCatalog: 'Вернуться к товарам',
      brandLabel: 'Бренд',
      categoryLabel: 'Категория',
      productKindLabel: 'Тип товара',
      warrantyLabel: 'Гарантия',
      variantsTitle: 'Выберите вариант',
      defaultVariantLabel: 'Основной',
      selectedSkuLabel: 'Выбранный SKU',
      specificationsTitle: 'Габариты и вес',
      weightLabel: 'Вес',
      weightUnit: 'г',
      dimensionsLabel: 'Габариты (Д × Ш × В)',
      lengthLabel: 'Длина',
      widthLabel: 'Ширина',
      heightLabel: 'Высота',
      mmUnit: 'мм',
      descriptionTitle: 'О товаре',
      orderButton: 'Оформить заказ',
      guestOrderHint: 'Войдите в аккаунт, чтобы продолжить оформление заказа.',
      signedInOrderNoticeTitle: 'Оформление заказа пока недоступно',
      signedInOrderNoticeBody:
        'Выбранный товар и вариант готовы, однако текущее API каталога ещё не поддерживает создание онлайн-заказов.',
      postLoginOrderNoticeTitle: 'Вы успешно вошли в аккаунт',
      postLoginOrderNoticeBody:
        'Выбранный товар и вариант сохранены. Текущее API каталога ещё не поддерживает создание заказов, поэтому заказ не отправлялся.',
      selectedSummaryLabel: 'Выбранный товар и вариант',
      completeProfileLink: 'Заполнить данные профиля',
      noPriceLabel: 'Цена не указана',
      addToCart: 'В корзину',
      cartButtonLabel: 'Корзина',
      cartTitle: 'Корзина',
      cartEmptyTitle: 'Корзина пуста',
      cartEmptyDescription: 'Выберите товары из каталога и добавьте их в корзину.',
      cartClearButton: 'Очистить корзину',
      cartRemoveItem: 'Удалить',
      cartUnitPrice: 'Цена за шт.',
      cartLineTotal: 'Сумма',
      cartTotalLabel: 'Итого',
      cartItemsCountSuffix: 'шт.',
      cartOrderButton: 'Оформить заказ',
      cartOrderUnavailableTitle: 'Заказ не отправлен — API недоступно',
      cartOrderUnavailableBody:
        'Товары в корзине сохранены, однако текущий бэкенд ещё не поддерживает API создания заказов.',
      cartPostLoginTitle: 'Вы успешно вошли в аккаунт',
      cartPostLoginBody:
        'Содержимое корзины сохранено. Текущий бэкенд ещё не поддерживает API создания заказов, поэтому заказ не отправлялся.',
      cartNoPriceBlocked: 'Нельзя оформить товар без указанной цены.',
      decreaseQuantityLabel: 'Уменьшить количество',
      increaseQuantityLabel: 'Увеличить количество',
      shareButton: 'Поделиться',
      shareAriaLabel: 'Поделиться ссылкой на товар',
      shareCopiedSuccess: 'Ссылка скопирована',
      shareFallbackTitle: 'Скопировать ссылку',
      shareFallbackDescription:
        'Браузер не разрешил автоматическое копирование. Выделите и скопируйте полную ссылку ниже вручную.',
      shareFallbackSelectButton: 'Выделить ссылку',
      shareFallbackClose: 'Закрыть',
      allCategoriesButton: 'Все категории',
      allCategoriesModalTitle: 'Все категории',
      chooseVariantButton: 'Выбрать вариант',
      selectVariantModalTitle: 'Выберите вариант',
      inCartLabel: 'В корзине',
      prevImageAriaLabel: 'Предыдущее фото',
      nextImageAriaLabel: 'Следующее фото',
      closeButton: 'Закрыть',
    },
    guestAuth: {
      modalTitle: 'Войдите для оформления заказа',
      modalSubtitle:
        'После входа выбранный товар и содержимое корзины сохранятся.',
      selectedItemLabel: 'Сохранённый выбор',
      cartSummaryLabel: 'Товары в корзине',
      cartItemsUnit: 'шт.',
      signInTab: 'Вход',
      signUpTab: 'Регистрация',
      cancelButton: 'Отмена',
    },
    productSocial: {
      sectionTitle: 'Комментарии',
      likeProductLabel: 'Поставить лайк товару',
      unlikeProductLabel: 'Убрать лайк с товара',
      likeCommentLabel: 'Поставить лайк комментарию',
      unlikeCommentLabel: 'Убрать лайк с комментария',
      commentsCountSuffix: 'комментариев',
      commentPlaceholder: 'Напишите отзыв или вопрос о товаре...',
      commentSubmitButton: 'Оставить комментарий',
      guestCommentHint: 'Войдите в аккаунт, чтобы оставлять комментарии, отвечать или ставить лайки.',
      guestLoginPromptButton: 'Войти',
      replyButton: 'Ответить',
      replyingToLabel: 'Ответ пользователю',
      replyPlaceholder: 'Введите текст ответа...',
      replySubmitButton: 'Отправить ответ',
      cancelButton: 'Отмена',
      viewRepliesButton: 'Показать ответы',
      hideRepliesButton: 'Скрыть ответы',
      loadingComments: 'Загрузка комментариев...',
      loadingReplies: 'Загрузка ответов...',
      loadMoreComments: 'Загрузить ещё комментарии',
      loadMoreReplies: 'Загрузить ещё ответы',
      emptyTitle: 'Комментариев пока нет',
      emptyDescription: 'Станьте первым, кто оставит комментарий к этому товару.',
      editedLabel: 'изменено',
      deletedPlaceholder: 'Комментарий удалён',
      editButton: 'Редактировать',
      saveEditButton: 'Сохранить',
      deleteButton: 'Удалить',
      deleteConfirmTitle: 'Удалить комментарий?',
      deleteConfirmDescription: 'Удалённый комментарий нельзя восстановить.',
      deleteConfirmOk: 'Да, удалить',
      deleteConfirmCancel: 'Отмена',
      validationRequired: 'Введите текст комментария.',
      validationMaxLength: 'Текст не должен превышать 2000 символов.',
      commentCreatedSuccess: 'Комментарий добавлен.',
      replyCreatedSuccess: 'Ответ отправлен.',
      commentUpdatedSuccess: 'Комментарий обновлён.',
      commentDeletedSuccess: 'Комментарий удалён.',
      sessionRestoredNotice: 'Вы вошли в аккаунт — теперь можно завершить действие.',
      ownCommentBadge: 'Вы',
      ownCommentAriaLabel: 'Ваш комментарий',
      authorAvatarAltPrefix: 'Фото профиля',
    },
    orders: {
      checkoutSectionTitle: 'Оформление заказа',
      checkoutSectionSubtitle:
        'Укажите контакты и выберите способ получения заказа. Итоговую сумму рассчитывает сервер.',
      phoneLabel: 'Номер телефона',
      phonePlaceholder: '+998901234567',
      phoneHint:
        'Контактный номер только для этого заказа (допустимы +, пробелы, скобки, дефисы; 7–15 цифр).',
      telegramLabel: 'Адрес Telegram',
      telegramPlaceholder: '@oson_xaridor или https://t.me/oson_xaridor',
      telegramHint:
        'Укажите @username или ссылку https://t.me/username для связи (не числовой chat ID уведомлений).',
      fulfillmentTitle: 'Способ получения',
      fulfillmentMethods: {
        PICKUP: 'Самовывоз из филиала',
        DELIVERY: 'Доставка курьером',
      },
      pickupMethodHint: 'Бесплатный самовывоз из выбранного филиала',
      deliveryMethodHint: 'Доставка курьером по адресу и точке на карте',
      selectBranchLabel: 'Выберите филиал',
      loadingBranches: 'Загрузка филиалов...',
      noBranchesForMethod: 'Для этого способа получения пока нет активных филиалов.',
      branchesLoadError: 'Не удалось загрузить список филиалов.',
      deliveryAddressLabel: 'Адрес доставки',
      deliveryAddressPlaceholder: 'Улица, дом, квартира или ориентир',
      selectedAddressLabel: 'Выбранный адрес',
      resolvingAddressLabel: 'Определяем адрес...',
      approximateAddressBadge: 'Примерный адрес',
      approximateAddressHint:
        'Номер дома не найден — указан примерный адрес по улице и району.',
      geocodeFallbackNote:
        'Не удалось определить точный адрес улицы — будут отправлены координаты точки.',
      selectPointPrompt:
        'Нажмите «Определить мою геолокацию» или выберите точку на карте для автозаполнения адреса.',
      addressNoteLabel: 'Квартира, подъезд или ориентир (необязательно)',
      addressNotePlaceholder: 'Например: кв. 12, подъезд 2, домофон 12',
      distanceUnavailable: 'Расстояние недоступно',
      nearestSortedHint: 'Ближайшие к выбранной точке филиалы показаны первыми',
      locationLabel: 'Точка на карте',
      getLocationButton: 'Определить мою геолокацию',
      gettingLocationLabel: 'Определяем геолокацию...',
      locationPermissionDeniedHint:
        'Доступ к геолокации запрещён. Выберите точку на карте или введите координаты вручную.',
      locationUnsupportedHint:
        'Браузер не поддерживает геолокацию. Выберите точку на карте или введите координаты вручную.',
      locationFoundHint: 'Геолокация определена. При необходимости перетащите маркер на карте.',
      latitudeLabel: 'Широта (latitude)',
      longitudeLabel: 'Долгота (longitude)',
      mapPickHint: 'Нажмите на карту или перетащите маркер для выбора точки доставки.',
      deliveryQuoteLoading: 'Расчёт стоимости доставки...',
      deliveryQuoteError: 'Не удалось рассчитать стоимость доставки.',
      distanceLabel: 'Расстояние',
      ratePerKmLabel: 'Тариф за км',
      deliveryFeeLabel: 'Стоимость доставки',
      straightLineHint: 'Расстояние рассчитывается по прямой (STRAIGHT_LINE)',
      estimatedTotalLabel: 'Предварительный итог',
      serverFinalTotalNote: 'Итоговая сумма фиксируется сервером в grandTotal после оформления',
      submitOrderButton: 'Подтвердить заказ',
      editCartButton: 'Назад в корзину',
      itemsLimitError: 'В одном заказе допускается не более 50 различных вариантов.',
      itemQuantityLimitError: 'Количество каждого варианта должно быть от 1 до 99 шт.',
      networkRetryHint:
        'Сбой сети. Можно безопасно повторить отправку с теми же данными — дубликат заказа не создастся.',
      priceChangedNotice:
        'Статус товара или цена могли измениться. Проверьте каталог и попробуйте снова.',
      orderCreatedTitle: 'Заказ успешно оформлен',
      orderReplayedTitle: 'Данные заказа подтверждены',
      orderNumberLabel: 'Номер заказа',
      orderStatusLabel: 'Статус',
      placedAtLabel: 'Дата оформления',
      contactLabel: 'Контактные данные',
      fulfillmentSummaryTitle: 'Доставка и филиал',
      branchLabel: 'Филиал',
      paymentStatusLabel: 'Статус оплаты',
      paidAtLabel: 'Время оплаты',
      unpaidLabel: 'Не оплачен',
      cancellationReasonLabel: 'Причина / Комментарий',
      historyTitle: 'История статусов заказа',
      historyEmpty: 'История изменений статуса пока отсутствует.',
      subtotalLabel: 'Стоимость товаров',
      discountTotalLabel: 'Скидка',
      shippingTotalLabel: 'Доставка',
      shippingZeroNote: 'Стоимость доставки 0 (самовывоз)',
      grandTotalLabel: 'Итоговая сумма',
      paymentPendingNote: 'Заказ создан — ожидайте подтверждения оператора или инструкций по оплате.',
      viewMyOrdersButton: 'Перейти к моим заказам',
      viewOrderDetailButton: 'Детали заказа',
      continueShoppingButton: 'Продолжить покупки',
      myOrdersTitle: 'Мои заказы',
      myOrdersSubtitle: 'Все заказы, оформленные с вашего аккаунта, и их текущий статус',
      refreshButton: 'Обновить',
      totalCountLabel: 'Всего',
      emptyTitle: 'У вас пока нет заказов',
      emptyDescription: 'Выберите товары из каталога и оформите первый заказ.',
      goToCatalogButton: 'Перейти в каталог',
      columns: {
        orderNumber: 'Номер заказа',
        placedAt: 'Дата',
        status: 'Статус',
        itemsCount: 'Позиции',
        grandTotal: 'Сумма',
        actions: 'Действия',
      },
      viewDetailsAction: 'Подробнее',
      detailTitlePrefix: 'Заказ',
      backToOrdersButton: 'К моим заказам',
      loadingDetail: 'Загрузка сведений о заказе...',
      notFoundTitle: 'Заказ не найден',
      notFoundSubtitle: 'Запрошенный заказ не существует или не принадлежит вашему аккаунту.',
      customerInfoTitle: 'Информация о заказе и контактах',
      itemsListTitle: 'Состав заказа',
      unitPriceLabel: 'Цена за шт.',
      discountLabel: 'Скидка',
      lineTotalLabel: 'Сумма',
      quantityLabel: 'Кол-во',
      summaryTitle: 'Итоги расчёта',
      orderProgressTitle: 'Этапы заказа',
      legacyStatusNote: 'Используется устаревший статус — полная история изменений представлена ниже.',
      cancelOrderButton: 'Отменить заказ',
      cancelModalTitle: 'Отмена заказа',
      cancelModalSubtitle: 'Укажите причину отмены заказа. После отмены восстановить заказ будет нельзя.',
      cancelReasonLabel: 'Причина отмены (обязательно, до 1000 символов)',
      cancelReasonPlaceholder: 'Например: Передумал(а) или выбрал(а) другой товар',
      cancelReasonRequired: 'Введите причину отмены.',
      cancelReasonMaxLength: 'Причина не должна превышать 1000 символов.',
      cancelConfirmButton: 'Да, отменить заказ',
      cancelKeepOrderButton: 'Назад',
      cancelSuccessMessage: 'Заказ отменён.',
      ratingSectionTitle: 'Оценка сервиса',
      ratingFormPrompt: 'Оцените качество доставки и обслуживания от 1 до 5 звёзд.',
      ratingStarsLabel: 'Оценка (1–5 звёзд)',
      ratingRequiredError: 'Пожалуйста, выберите от 1 до 5 звёзд.',
      ratingCommentLabel: 'Комментарий (необязательно, до 1000 символов)',
      ratingCommentPlaceholder: 'Поделитесь впечатлением о доставке и сервисе...',
      ratingCommentMaxLength: 'Комментарий не должен превышать 1000 символов.',
      ratingSubmitButton: 'Отправить оценку',
      ratingSuccessMessage: 'Спасибо! Ваша оценка сервиса сохранена.',
      ratedAtLabel: 'Дата оценки',
      submittedReviewLabel: 'Ваш отзыв',
      ratingOutOfFive: 'из 5',
      statusNames: {
        PENDING: 'Ожидает подтверждения',
        NEW_UNPAID: 'Новый, не оплачен',
        NEW_PAID: 'Новый, оплачен',
        CONFIRMED: 'Подтверждён',
        PROCESSING: 'Готовится',
        READY_FOR_PICKUP: 'Готов к самовывозу',
        PICKED_UP: 'Получен в пункте выдачи',
        READY_FOR_DELIVERY: 'Готов к доставке',
        SHIPPED: 'Отправлен',
        OUT_FOR_DELIVERY: 'Курьер в пути',
        DELIVERY_FAILED: 'Не удалось доставить',
        DELIVERED: 'Доставлен',
        CANCELLED: 'Отменён',
      },
      validation: {
        requiredPhone: 'Введите номер телефона',
        invalidPhone:
          'Введите корректный номер телефона (допустимы +, пробелы, скобки и дефисы; от 7 до 15 цифр)',
        requiredTelegram: 'Введите адрес Telegram',
        invalidTelegram: 'Например: @oson_xaridor или https://t.me/oson_xaridor',
        requiredBranch: 'Выберите филиал',
        requiredDeliveryAddress: 'Введите адрес доставки',
        requiredLocation: 'Выберите точку доставки на карте или укажите координаты',
        invalidLatitude: 'Широта должна быть от -90 до 90',
        invalidLongitude: 'Долгота должна быть от -180 до 180',
        emptyCart: 'Для оформления заказа добавьте хотя бы один товар в корзину',
      },
    },
    adminTelegramRecipients: {
      menuGroupLabel: 'Заказы',
      title: 'Telegram-уведомления',
      subtitle: 'Управление списком Telegram chat ID для уведомлений о новых заказах',
      refreshButton: 'Обновить',
      totalCountLabel: 'Всего получателей',
      checkingPermissions: 'Проверка прав администратора...',
      userRoleBlockedTitle: 'Требуется вход с аккаунтом ADMIN',
      userRoleBlockedSubtitle:
        'Управление получателями Telegram-уведомлений доступно только администраторам. Роль текущего аккаунта: USER.',
      switchAccountButton: 'Войти в аккаунт ADMIN',
      backendForbiddenTitle: 'Сервер отклонил доступ (403)',
      backendForbiddenSubtitle:
        'Хотя ваш профиль вернул роль ADMIN, сервер вернул ошибку доступа 403 для этого эндпоинта.',
      backendForbiddenEndpointLabel: 'Отклонённый эндпоинт',
      backToStore: 'Вернуться в магазин',
      botNoteTitle: 'Условия работы Telegram-уведомлений',
      botNotePrivateChat:
        'Для отправки в личный чат владелец должен предварительно запустить бота командой /start.',
      botNoteGroupChat:
        'Для отправки в группу или канал бот должен быть добавлен в чат с правом отправки сообщений.',
      botNoteNoImmediateTest:
        'Добавление chat ID не отправляет тестовое сообщение. Уведомления ставятся в очередь после сохранения нового заказа.',
      formTitle: 'Добавить Chat ID',
      chatIdLabel: 'Telegram Chat ID',
      chatIdPlaceholder: '-1001234567890',
      chatIdHelp: 'Положительный для личного чата, отрицательный для группы (строка, например: -1001234567890)',
      labelLabel: 'Название / метка (необязательно)',
      labelPlaceholder: 'Группа склада',
      addButton: 'Добавить',
      emptyTitle: 'Получатели пока не добавлены',
      emptyDescription:
        'Добавьте хотя бы один Telegram chat ID, чтобы получать уведомления о новых заказах.',
      columns: {
        chatId: 'Chat ID',
        label: 'Метка',
        actions: 'Действия',
      },
      noLabel: '—',
      deleteButton: 'Удалить',
      deleteConfirmTitle: 'Удалить Chat ID?',
      deleteConfirmDescription:
        'На этот Telegram-чат больше не будут отправляться уведомления о новых заказах.',
      deleteConfirmOk: 'Да, удалить',
      deleteConfirmCancel: 'Отмена',
      validation: {
        chatIdRequired: 'Введите Telegram Chat ID',
        chatIdInvalid: 'Chat ID должен быть целым числом (может начинаться с -)',
        labelMaxLength: 'Метка не должна превышать 100 символов',
      },
      notifications: {
        createdSuccess: 'Telegram chat ID добавлен в список.',
        deletedSuccess: 'Telegram chat ID удалён из списка.',
      },
    },
    adminOrders: {
      title: 'Заказы',
      subtitle: 'Просмотр, поиск, управление способами получения и статусами всех заказов',
      refreshButton: 'Обновить',
      telegramSettingsButton: 'Telegram-уведомления',
      totalCountLabel: 'Всего заказов',
      statusFilterLabel: 'По статусу',
      allStatusesOption: 'Все статусы',
      orderNumberPlaceholder: 'Полный номер заказа (например: OM-...)',
      clearFilters: 'Сбросить фильтры',
      emptyTitle: 'Заказы не найдены',
      emptyDescription: 'По текущим фильтрам заказы отсутствуют.',
      columns: {
        orderNumber: 'Номер заказа',
        placedAt: 'Дата',
        status: 'Статус',
        branch: 'Филиал',
        fulfillment: 'Получение',
        payment: 'Оплата',
        contact: 'Контакт',
        grandTotal: 'Итого',
        actions: 'Действия',
      },
      paidBadge: 'Оплачен',
      unpaidBadge: 'Не оплачен',
      viewDetailsAction: 'Подробнее',
      detailTitlePrefix: 'Заказ',
      backToListButton: 'К списку заказов',
      loadingDetail: 'Загрузка деталей заказа...',
      notFoundTitle: 'Заказ не найден',
      notFoundSubtitle: 'Запрошенный заказ не существует или был удалён.',
      statusSectionTitle: 'Управление статусом заказа',
      currentStatusLabel: 'Текущий статус',
      availableTransitionsLabel: 'Доступные переходы статуса',
      reasonModalTitle: 'Причина / комментарий к смене статуса',
      reasonLabelDefault: 'Причина (обязательно, до 1000 символов)',
      reasonLabelPaid: 'Комментарий о подтверждении оплаты (обязательно, до 1000 символов)',
      reasonPlaceholderDefault: 'Укажите причину...',
      reasonPlaceholderPaid: 'Например: Оплата подтверждена по транзакции Payme/Click #12345',
      reasonPlaceholderCancelled: 'Например: Покупатель попросил отменить заказ',
      reasonPlaceholderDeliveryFailed: 'Например: Покупатель не отвечает на звонки',
      reasonRequiredError: 'Для перехода в этот статус обязательно укажите причину или комментарий.',
      reasonMaxLengthError: 'Комментарий не должен превышать 1000 символов.',
      confirmTransitionButton: 'Подтвердить',
      cancelTransitionButton: 'Отмена',
      fulfillmentSectionTitle: 'Редактирование филиала и доставки',
      fulfillmentEditLockedHint:
        'Изменять филиал и способ получения можно только для неоплаченных заказов в статусах PENDING, NEW_UNPAID или CONFIRMED.',
      saveFulfillmentButton: 'Сохранить способ получения',
      testQuoteButton: 'Рассчитать тариф',
      fulfillmentUpdatedSuccess: 'Способ получения и данные филиала обновлены.',
      statusUpdatedSuccess: 'Статус заказа обновлён.',
      conflictReloadNotice:
        'Статус заказа уже изменился на сервере. Загружены актуальные данные.',
      customerInfoTitle: 'Контактные данные покупателя',
      itemsListTitle: 'Состав заказа',
      summaryTitle: 'Итоги расчёта',
      historyTitle: 'История изменений заказа',
      historyActorLabel: 'Исполнитель ID',
      historyEmpty: 'История изменений пока пуста.',
      noContactValue: '—',
      serviceRatingTitle: 'Оценка покупателя',
    },
    adminBranches: {
      menuGroupLabel: 'Админ-панель',
      title: 'Филиалы',
      subtitle: 'Управляйте пунктами самовывоза и доставки, графиком работы и тарифом за километр',
      createButton: 'Новый филиал',
      refreshButton: 'Обновить',
      totalCountLabel: 'Всего филиалов',
      emptyTitle: 'Филиалы не найдены',
      emptyDescription: 'Пока не добавлено ни одного филиала. Создайте первый филиал.',
      columns: {
        image: 'Фото',
        name: 'Название',
        address: 'Адрес',
        phone: 'Телефон',
        workingHours: 'Режим работы',
        status: 'Статус',
        services: 'Услуги',
        pricePerKm: 'Тариф за км',
        actions: 'Действия',
      },
      statusActive: 'Активен',
      statusInactive: 'Неактивен',
      statusArchived: 'В архиве',
      pickupBadge: 'Самовывоз',
      deliveryBadge: 'Доставка',
      noServicesLabel: 'Услуги отключены',
      perKmSuffix: 'сум/км',
      viewButton: 'Подробнее',
      editButton: 'Редактировать',
      archiveButton: 'В архив',
      archiveConfirmTitle: 'Отправить филиал в архив?',
      archiveConfirmDescription:
        'Архивный филиал больше не будет отображаться покупателям при оформлении заказа.',
      archiveConfirmOk: 'Да, в архив',
      archiveConfirmCancel: 'Отмена',
      detailDrawerTitle: 'Детали филиала',
      detailLoading: 'Загрузка сведений о филиале...',
      quoteTesterTitle: 'Проверка расчёта стоимости доставки',
      quoteTesterButton: 'Рассчитать',
      drawerCreateTitle: 'Добавить филиал',
      drawerEditTitle: 'Редактировать филиал',
      codeLabel: 'Код филиала (slug)',
      codePlaceholder: 'toshkent-markaz',
      nameUzLabel: 'Название (Узбекский)',
      nameUzPlaceholder: 'Toshkent markaz',
      nameRuLabel: 'Название (Русский)',
      nameRuPlaceholder: 'Ташкент центр',
      cityLabel: 'Город',
      cityPlaceholder: 'Ташкент',
      addressLineLabel: 'Адрес',
      addressLinePlaceholder: 'ул. Марказ, 1',
      phoneLabel: 'Телефон',
      phonePlaceholder: '+998901234567',
      emailLabel: 'Email',
      emailPlaceholder: 'branch@example.com',
      workingHoursLabel: 'Режим работы',
      workingHoursPlaceholder: '09:00–20:00',
      pricePerKmLabel: 'Тариф за километр (UZS/км)',
      activeLabel: 'Филиал активен',
      pickupEnabledLabel: 'Самовывоз включён',
      deliveryEnabledLabel: 'Доставка включена',
      locationTitle: 'Координаты филиала',
      getLocationButton: 'Определить мою геолокацию',
      gettingLocationLabel: 'Определение...',
      resolvingAddressLabel: 'Определение адреса по координатам...',
      approximateAddressBadge: 'Примерный',
      approximateAddressHint:
        'Точный номер дома не найден. При необходимости уточните улицу и номер дома вручную.',
      geocodeFallbackHint:
        'Не удалось определить адрес автоматически — введите город и адрес вручную.',
      detectedAreaLabel: 'Определённый район и регион',
      mapPickHint:
        'Нажмите на карту, перетащите маркер или нажмите «Определить мою геолокацию» — адрес заполнится автоматически.',
      imageSectionTitle: 'Изображение филиала',
      imageUploadHint: 'PNG, JPEG или WebP, до 5 МБ',
      selectImageButton: 'Выбрать фото',
      replaceImageButton: 'Заменить фото',
      removeImageButton: 'Удалить фото',
      removeImageConfirm: 'Удалить изображение филиала?',
      saveButton: 'Сохранить',
      cancelButton: 'Отмена',
      validation: {
        codeRequired: 'Введите код филиала',
        nameUzRequired: 'Введите название на узбекском',
        nameRuRequired: 'Введите название на русском',
        cityRequired: 'Введите город',
        addressRequired: 'Введите адрес',
        phoneRequired: 'Введите номер телефона',
        invalidPhone: 'Введите корректный номер телефона',
        emailInvalid: 'Введите корректный email адрес',
        workingHoursRequired: 'Укажите режим работы',
        pricePerKmRequired: 'Укажите тариф за километр (0 или больше)',
        coordinatesRequired: 'Выберите или введите координаты филиала',
        imageInvalidType: 'Допустимы только изображения PNG, JPEG или WebP',
        imageTooLarge: 'Размер изображения не должен превышать 5 МБ',
        imageUnreadable: 'Не удалось прочитать выбранный файл изображения',
      },
      notifications: {
        createdSuccess: 'Новый филиал создан.',
        updatedSuccess: 'Данные филиала обновлены.',
        archivedSuccess: 'Филиал перемещён в архив.',
        imageUpdatedSuccess: 'Изображение филиала обновлено.',
        imageDeletedSuccess: 'Изображение филиала удалено.',
      },
    },
    branchesPage: {
      title: 'Филиалы Oson Market',
      subtitle:
        'Найдите ближайший филиал, посмотрите режим работы, контактный телефон и доступные услуги самовывоза или доставки.',
      getLocationButton: 'Определить мою геолокацию',
      gettingLocationLabel: 'Определяем геолокацию...',
      pickOnMapButton: 'Выбрать на карте',
      hideMapButton: 'Скрыть карту',
      clearLocationButton: 'Сбросить точку',
      mapHint: 'Нажмите на карту или перетащите зелёный маркер для расчёта расстояния.',
      selectedPointLabel: 'Выбранная точка',
      resolvingAddressLabel: 'Определяем адрес...',
      sortedByNearestNotice: 'Филиалы отсортированы по близости к выбранной точке',
      defaultOrderNotice:
        'Поделитесь геолокацией или выберите точку на карте, чтобы увидеть расстояние до ближайших филиалов.',
      distanceLabel: 'Расстояние',
      distanceUnavailable: 'Расстояние недоступно',
      pickupAvailable: 'Самовывоз',
      deliveryAvailable: 'Доставка',
      emptyTitle: 'Активные филиалы не найдены',
      emptyDescription: 'Сейчас список активных филиалов пуст.',
      refreshButton: 'Обновить',
      workingHoursLabel: 'Режим работы',
      phoneLabel: 'Телефон',
      totalBranchesLabel: 'Всего филиалов',
    },
    notificationsPanel: {
      bellAriaLabel: 'Уведомления',
      drawerTitle: 'Уведомления',
      unreadCountLabel: 'Непрочитано',
      refreshButton: 'Обновить',
      emptyTitle: 'Уведомлений пока нет',
      emptyDescription: 'Здесь появятся сообщения об изменении статусов ваших заказов.',
      unreadLabel: 'Новое',
      readLabel: 'Прочитано',
      openOrderHint: 'Открыть заказ',
      statusAtEventLabel: 'Статус в момент события',
      reasonLabel: 'Комментарий / Причина',
      loadMoreButton: 'Загрузить ещё',
      rateServiceAction: 'Оценить сервис',
    },
    adminSiteLogo: {
      title: 'Логотип сайта',
      subtitle: 'Управляйте основным логотипом для шапки сайта, страниц входа и favicon',
      refreshButton: 'Обновить',
      currentLogoTitle: 'Текущий логотип',
      currentLogoSubtitle: 'Логотип, который сейчас отображается на всех страницах сайта',
      fallbackNote: 'Если логотип не загружается, на сайте отображается текст «Oson Market».',
      uploadSectionTitle: 'Загрузить новый логотип',
      fileHint: 'Формат PNG или JPEG · не более 2 МБ · до 2048×2048 px',
      previewTitle: 'Предпросмотр',
      previewAlt: 'Предпросмотр нового логотипа сайта',
      previewEmpty: 'Выберите файл PNG или JPEG, чтобы увидеть предпросмотр перед сохранением',
      selectFileButton: 'Выбрать файл',
      changeFileButton: 'Выбрать другой файл',
      resetSelectionButton: 'Сбросить',
      saveButton: 'Сохранить',
      savedSuccess: 'Логотип сайта успешно обновлён.',
      checkingPermissions: 'Проверяем права администратора...',
      userRoleBlockedTitle: 'Требуется вход с аккаунтом ADMIN',
      userRoleBlockedSubtitle:
        'Изменение логотипа сайта доступно только администраторам. Текущая роль вашего профиля: USER.',
      switchAccountButton: 'Войти как ADMIN',
      backendForbiddenTitle: 'Сервер отклонил запрос (403)',
      backendForbiddenSubtitle:
        'Ваш профиль имеет роль ADMIN, однако backend вернул ошибку доступа 403 для этого запроса.',
      backendForbiddenEndpointLabel: 'Отклонённый endpoint',
      backToStore: 'Вернуться в магазин',
      validation: {
        invalidType: 'Загрузите изображение в формате PNG или JPEG',
        tooLarge: 'Размер файла не должен превышать 2 МБ',
        invalidDimensions: 'Размеры изображения не должны превышать 2048×2048 px',
        unreadable: 'Не удалось прочитать выбранный файл изображения',
      },
    },
    adminSiteAbout: {
      title: 'О нас',
      subtitle: 'Управляйте заголовком и описанием раздела «О нас» на узбекском и русском языках',
      refreshButton: 'Обновить',
      retryButton: 'Повторить',
      lastUpdatedLabel: 'Последнее обновление',
      notCreatedYet: 'Ещё не создано',
      emptyNoticeTitle: 'Раздел ещё не создан',
      emptyNoticeDescription:
        'Заполните заголовок и описание для обоих языков и нажмите кнопку «Сохранить».',
      uzSectionTitle: 'O‘zbekcha',
      uzSectionBadge: 'UZ',
      ruSectionTitle: 'Русский',
      ruSectionBadge: 'RU',
      titleLabel: 'Заголовок',
      titlePlaceholderUz: 'Biz haqimizda',
      titlePlaceholderRu: 'О нас',
      descriptionLabel: 'Описание',
      descriptionPlaceholderUz: 'Oson Market haqida o‘zbekcha matn...',
      descriptionPlaceholderRu: 'Текст об Oson Market на русском языке...',
      saveButton: 'Сохранить',
      savedSuccess: 'Раздел «О нас» успешно сохранён.',
      loadErrorFallback: 'Не удалось загрузить данные раздела «О нас».',
      saveErrorFallback: 'Не удалось сохранить данные раздела «О нас».',
      savedPreviewTitle: 'Сохранённый текст',
      savedPreviewSubtitle: 'Отображается как обычный текст с сохранением переносов строк',
      checkingPermissions: 'Проверяем права администратора...',
      userRoleBlockedTitle: 'Требуется вход с аккаунтом ADMIN',
      userRoleBlockedSubtitle:
        'Управление разделом «О нас» доступно только администраторам. Текущая роль вашего профиля: USER.',
      switchAccountButton: 'Войти как ADMIN',
      backendForbiddenTitle: 'Доступ запрещён (403)',
      backendForbiddenSubtitle:
        'У вас недостаточно прав администратора для просмотра или изменения раздела «О нас».',
      backendForbiddenEndpointLabel: 'Отклонённый endpoint',
      backToStore: 'Вернуться в магазин',
      validation: {
        titleRequiredUz: 'Введите заголовок на узбекском языке.',
        titleMaxLengthUz: 'Заголовок на узбекском не должен превышать 200 символов.',
        descriptionRequiredUz: 'Введите описание на узбекском языке.',
        descriptionMaxLengthUz: 'Описание на узбекском не должно превышать 10 000 символов.',
        titleRequiredRu: 'Введите заголовок на русском языке.',
        titleMaxLengthRu: 'Заголовок на русском не должен превышать 200 символов.',
        descriptionRequiredRu: 'Введите описание на русском языке.',
        descriptionMaxLengthRu: 'Описание на русском не должно превышать 10 000 символов.',
        socialUrlHttps: 'Укажите полную ссылку, начинающуюся с https://.',
        socialUrlMaxLength: 'Длина ссылки не должна превышать 2048 символов.',
      },
      socialLinksSectionTitle: 'Социальные сети',
      socialLinksSectionSubtitle:
        'Необязательные ссылки. Принимаются только полные адреса https:// (пустые поля не отправляются).',
      socialLinksUrlHint: 'Например: https://... · не более 2048 символов',
      socialLinksClearAllButton: 'Очистить все ссылки',
    },
    aboutPage: {
      pageTitle: 'О нас',
      defaultTitle: 'О нас',
      emptyTitle: 'Информация пока не опубликована',
      emptyDescription: 'Сведения о компании скоро появятся на этой странице.',
      refreshButton: 'Обновить',
      retryButton: 'Повторить',
      lastUpdatedLabel: 'Обновлено',
      socialLinksTitle: 'Социальные сети',
      backToStore: 'Вернуться в каталог',
    },
    adminUsers: {
      title: 'Пользователи',
      subtitle: 'Просмотр, поиск и управление статусом зарегистрированных пользователей',
      refreshButton: 'Обновить',
      retryButton: 'Повторить',
      totalCountLabel: 'Всего пользователей',
      searchPlaceholder: 'Поиск по имени, фамилии, телефону, email или username...',
      searchMaxHint: 'Максимум 255 символов',
      roleFilterLabel: 'Роль',
      roleFilterAll: 'Все',
      statusFilterLabel: 'Статус',
      statusFilterAll: 'Все',
      clearFilters: 'Сбросить фильтры',
      checkingPermissions: 'Проверяем права администратора...',
      userRoleBlockedTitle: 'Раздел доступен только администраторам',
      userRoleBlockedSubtitle:
        'Вы вошли с обычным аккаунтом пользователя. Для управления пользователями войдите как администратор.',
      switchAccountButton: 'Войти под другим аккаунтом',
      backendForbiddenTitle: 'Доступ запрещён сервером (403)',
      backendForbiddenSubtitle:
        'У вашего аккаунта недостаточно прав для доступа к этому разделу.',
      backendForbiddenEndpointLabel: 'Адрес запроса',
      backToStore: 'Вернуться в магазин',
      notProvided: 'Не указано',
      emptyTitle: 'Пользователи не найдены',
      emptyDescription: 'Пока нет зарегистрированных пользователей.',
      emptyFilteredDescription:
        'По заданному поиску или фильтрам пользователи не найдены.',
      paginationTotalTemplate: 'Всего: {total}',
      roleNames: {
        USER: 'USER (Покупатель)',
        ADMIN: 'ADMIN',
      },
      statusNames: {
        ACTIVE: 'Активен',
        BLOCKED: 'Заблокирован',
      },
      columns: {
        fullName: 'Имя и фамилия',
        username: 'Username',
        email: 'Email',
        phone: 'Телефон',
        role: 'Роль',
        status: 'Статус',
        createdAt: 'Дата регистрации',
        actions: 'Действия',
      },
      actions: {
        viewDetails: 'Подробнее',
        block: 'Заблокировать',
        activate: 'Активировать',
      },
      detail: {
        title: 'Данные пользователя',
        loading: 'Загружаем данные пользователя...',
        accountIdLabel: 'ID аккаунта',
        fullNameLabel: 'Имя и фамилия',
        firstNameLabel: 'Имя',
        lastNameLabel: 'Фамилия',
        usernameLabel: 'Username',
        emailLabel: 'Email',
        phoneLabel: 'Телефон',
        roleLabel: 'Роль',
        statusLabel: 'Статус',
        languageLabel: 'Язык интерфейса',
        emailVerificationLabel: 'Подтверждение email',
        emailVerifiedBadge: 'Подтверждён',
        emailUnverifiedBadge: 'Не подтверждён',
        createdAtLabel: 'Дата регистрации',
        updatedAtLabel: 'Последнее обновление',
        adminImmutableNote:
          'Статус аккаунтов администраторов нельзя изменять из этого раздела.',
        closeButton: 'Закрыть',
      },
      confirmModal: {
        blockTitle: 'Блокировка пользователя',
        blockDescription: 'Вы подтверждаете блокировку этого аккаунта пользователя?',
        blockSessionWarning:
          'Блокировка немедленно завершит все текущие активные сессии пользователя.',
        activateTitle: 'Активация пользователя',
        activateDescription: 'Вы подтверждаете повторную активацию этого аккаунта пользователя?',
        accountSummaryLabel: 'Выбранный аккаунт',
        blockConfirmButton: 'Да, заблокировать',
        activateConfirmButton: 'Да, активировать',
        cancelButton: 'Отмена',
      },
      notifications: {
        blockedSuccess: 'Пользователь заблокирован, активные сессии завершены.',
        activatedSuccess: 'Аккаунт пользователя активирован.',
        notFoundError: 'Аккаунт пользователя не найден.',
      },
    },
    adminStatistics: {
      title: 'Статистика',
      subtitle: 'Отчёты по заказам, каталогу, пользователям, филиалам, активности и операциям',
      refreshButton: 'Обновить',
      retryButton: 'Повторить',
      checkingPermissions: 'Проверяем права администратора...',
      userRoleBlockedTitle: 'Раздел доступен только администраторам',
      userRoleBlockedSubtitle:
        'Вы вошли с обычным аккаунтом пользователя. Для просмотра статистики войдите как администратор.',
      switchAccountButton: 'Войти под другим аккаунтом',
      backendForbiddenTitle: 'Доступ запрещён сервером (403)',
      backendForbiddenSubtitle:
        'У вашего аккаунта недостаточно прав для просмотра раздела статистики.',
      backendForbiddenEndpointLabel: 'Адрес запроса',
      backToStore: 'Вернуться в магазин',
      noData: 'Нет данных',
      periodBadgePrefix: 'Период',
      currentStateBadge: 'Текущее состояние',
      timezoneLabel: 'Часовой пояс',
      tashkentTimezoneValue: 'Ташкент (UTC+5)',
      presets: {
        last7: '7 дней',
        last30: '30 дней',
        last90: '90 дней',
        custom: 'Свой период',
      },
      fromLabel: 'Дата начала',
      toLabel: 'Дата окончания',
      limitLabel: 'Лимит рейтинга',
      validation: {
        invalidDates: 'Укажите корректные даты начала и окончания.',
        fromAfterTo: 'Дата начала не может быть позже даты окончания.',
        maxDaysExceeded: 'Выбранный период не должен превышать 366 дней.',
      },
      sections: {
        OVERVIEW: 'Обзор',
        ORDERS: 'Заказы',
        CATALOG: 'Каталог',
        CUSTOMERS: 'Пользователи',
        BRANCHES: 'Филиалы',
        ENGAGEMENT: 'Активность',
        OPERATIONS: 'Операции',
      },
      emptyTitle: 'За выбранный период данные не найдены',
      emptyDescription: 'В указанном диапазоне дат показатели отсутствуют.',
      tableExpandDetails: 'Подробнее',
      tableCollapseDetails: 'Свернуть',
      chartTableToggleShow: 'Показать таблицу значений',
      chartTableToggleHide: 'Скрыть таблицу значений',
      chartDateColumn: 'Дата',
      chartNoPoints: 'За выбранный период нет ежедневных данных.',
      overview: {
        kpiSectionTitle: 'Ключевые показатели',
        otherMetricsTitle: 'Дополнительные общие показатели',
        dailyChartTitle: 'Ежедневная динамика',
        dailyChartSubtitle: 'Заказы, регистрации, комментарии и отметки об оплате по дням',
        currencySectionTitle: 'Суммы заказов по валютам',
        openReportHint: 'Открыть подробный отчёт',
        series: {
          orders: 'Заказы',
          registrations: 'Регистрации',
          comments: 'Комментарии',
          payments_marked: 'Отмечено оплаченными',
        },
      },
      ordersSection: {
        byStatusTitle: 'Распределение по статусам заказов',
        byFulfillmentTitle: 'Распределение по способу получения',
        fulfillmentMetricsTitle: 'Показатели исполнения и качества',
        uniqueCustomers: 'Уникальных покупателей',
        cancellationsWithReason: 'Отмен с указанной причиной',
        averageRating: 'Средняя оценка',
        averageDistanceKm: 'Среднее расстояние',
        ratingsTitle: 'Оценки сервиса (1–5 звёзд)',
        starsSuffix: 'зв.',
        statusChangesTitle: 'Переходы между статусами',
        fromStatusCol: 'Предыдущий статус',
        toStatusCol: 'Новый статус',
        transitionsCol: 'Переходов',
        topVariantsTitle: 'Топ вариантов товаров',
        skuCol: 'SKU',
        productCol: 'Товар',
        ordersCountCol: 'Заказов',
        unitsSoldCol: 'Продано шт.',
        discountCol: 'Скидка',
        totalAmountCol: 'Сумма',
        currencyTotalsTitle: 'Показатели заказов по валютам',
        currencyCol: 'Валюта',
        subtotalCol: 'Подытог',
        shippingCol: 'Доставка',
        paidMarkedCol: 'Отмечено как оплаченное',
        completedAmountCol: 'Сумма завершённых заказов',
        multiCurrencyNote: 'Каждая валюта отображается отдельно без суммирования между собой.',
      },
      catalogSection: {
        inventoryTitle: 'Инвентарь каталога',
        qualityTitle: 'Качество и полнота каталога',
        distributionsTitle: 'Распределение по каталогу',
        translationsTitle: 'Покрытие переводов',
        productTranslationsTitle: 'Переводы товаров',
        categoryTranslationsTitle: 'Переводы категорий',
        topCategoriesTitle: 'Топ категорий',
        topBrandsTitle: 'Топ брендов',
        nameCol: 'Название',
        slugCol: 'Slug',
        statusCol: 'Статус',
        productsCountCol: 'Товаров',
        activeLabel: 'Активен',
        inactiveLabel: 'Неактивен',
        withoutImages: 'Без изображений',
        withoutActivePrice: 'Без действующей цены',
        withoutCategory: 'Без категории',
        withoutBrand: 'Без бренда',
        productStatuses: 'Статусы товаров',
        productKinds: 'Типы товаров',
        variantStatuses: 'Статусы вариантов',
        categoryStatuses: 'Статусы категорий',
        brandStatuses: 'Статусы брендов',
        languageCol: 'Язык',
        recordsCountCol: 'Записей',
      },
      customersSection: {
        accountsTitle: 'Аккаунты и профили',
        distributionsTitle: 'Распределение пользователей',
        byRoleTitle: 'По ролям',
        byStatusTitle: 'По статусам',
        byLanguageTitle: 'По языку',
        orderFrequencyTitle: 'Частота покупок',
        dailyRegistrationsTitle: 'Ежедневная динамика регистраций',
        ordersBucketUnit: 'заказов',
      },
      branchesSection: {
        byStatusTitle: 'Статусы филиалов',
        capabilitiesTitle: 'Возможности обслуживания',
        branchOrdersTitle: 'Заказы по филиалам',
        branchCol: 'Филиал',
        unassignedBranch: 'Филиал не привязан',
        currencyCol: 'Валюта',
        methodCol: 'Способ',
        totalOrdersCol: 'Всего',
        cancelledCol: 'Отменено',
        completedCol: 'Завершено',
        completedAmountCol: 'Сумма завершённых',
        shippingAmountCol: 'Сумма доставки',
        avgDistanceCol: 'Ср. расстояние',
        avgRatingCol: 'Ср. оценка',
      },
      engagementSection: {
        commentsTitle: 'Активность комментариев',
        likesTitle: 'Текущее состояние лайков',
        currentLikesSubtitle: 'Актуальное количество лайков на данный момент (не зависит от фильтра дат)',
        dailyCommentsTitle: 'Ежедневная динамика комментариев',
        topLikedTitle: 'Самые оцениваемые товары (лайки)',
        topCommentedTitle: 'Самые комментируемые товары',
        productCol: 'Товар',
        likesCountCol: 'Лайки',
        commentsCountCol: 'Комментарии',
      },
      operationsSection: {
        siteTitle: 'Состояние сайта и каналов связи',
        mediaTitle: 'Медиафайлы по типам',
        verificationTitle: 'Коды подтверждения',
        queuesTitle: 'Уведомления и очереди отправки',
        notificationsQueueTitle: 'Уведомления в системе',
        emailQueueTitle: 'Очередь Email',
        telegramQueueTitle: 'Очередь Telegram',
        configuredLabel: 'Настроено',
        notConfiguredLabel: 'Не настроено',
        mediaTypeCol: 'Тип медиа',
        filesCountCol: 'Файлов',
        totalSizeCol: 'Общий объём',
        purposeCol: 'Назначение',
        issuedCol: 'Выпущено',
        usedCol: 'Использовано',
        expiredCol: 'Истекло',
      },
      labels: {
        orders: 'Количество заказов',
        orders_in_period: 'Заказы за период',
        total_orders: 'Всего заказов',
        completed_orders: 'Завершённые заказы',
        cancelled_orders: 'Отменённые заказы',
        paid_orders: 'Отмечено как оплаченные',
        payments_marked: 'Отмечено оплаченными',
        payments_marked_in_period: 'Отмечено оплаченными (период)',
        total_accounts: 'Всего аккаунтов',
        accounts: 'Всего аккаунтов',
        new_registrations: 'Новые регистрации',
        registrations: 'Новые регистрации',
        email_verified: 'С подтверждённым email',
        verified_emails: 'С подтверждённым email',
        google_linked: 'Привязанные к Google',
        complete_profiles: 'Заполненные профили',
        with_avatar: 'Профили с аватаром',
        products: 'Товары',
        total_products: 'Всего товаров',
        active_products: 'Активные товары',
        categories: 'Категории',
        brands: 'Бренды',
        variants: 'Варианты',
        images: 'Изображения',
        prices: 'Ценовые записи',
        price_records: 'Ценовые записи',
        branches: 'Филиалы',
        active_branches: 'Активные филиалы',
        pickup_enabled: 'Филиалы с самовывозом',
        delivery_enabled: 'Филиалы с доставкой',
        comments: 'Написано комментариев',
        total_comments: 'Написано комментариев',
        written_comments: 'Написано комментариев',
        new_comments: 'Новые комментарии',
        replies: 'Ответы',
        edited: 'Отредактированные',
        deleted: 'Удалённые',
        commenting_users: 'Авторы комментариев',
        unique_authors: 'Авторы комментариев',
        likes: 'Текущие лайки',
        current_likes: 'Текущие лайки',
        product_likes: 'Лайки товаров',
        comment_likes: 'Лайки комментариев',
        unread_notifications: 'Непрочитанные уведомления',
        read: 'Прочитано',
        unread: 'Не прочитано',
        sent: 'Отправлено',
        sent_in_period: 'Отправлено за период',
        pending: 'В ожидании',
        stopped: 'Остановлено',
        paused: 'Остановлено',
        failed: 'Остановлено / ошибка',
        retries: 'Повторные попытки',
        retry_count: 'Повторные попытки',
        retried: 'Повторно отправлено',
        logo: 'Логотип сайта',
        about: 'Раздел «О нас»',
        social_links: 'Социальные сети',
        telegram_recipients: 'Получатели Telegram',
        active_languages: 'Активные языки',
        active_currencies: 'Активные валюты',
        currencies: 'Валюты',
        ACTIVE: 'Активен',
        INACTIVE: 'Неактивен',
        ARCHIVED: 'В архиве',
        DRAFT: 'Черновик',
        BLOCKED: 'Заблокирован',
        USER: 'Покупатель',
        ADMIN: 'Администратор',
        PHYSICAL: 'Физический товар',
        DIGITAL: 'Цифровой товар',
        SERVICE: 'Услуга',
        SIGN_UP: 'Регистрация',
        SIGN_IN: 'Вход в систему',
        PASSWORD_RESET: 'Сброс пароля',
        EMAIL_CHANGE: 'Смена email',
        uz: 'O‘zbekcha',
        ru: 'Русский',
        PRODUCT_IMAGE: 'Изображения товаров',
        CATEGORY_IMAGE: 'Изображения категорий',
        BRAND_LOGO: 'Логотипы брендов',
        BRANCH_IMAGE: 'Изображения филиалов',
        USER_AVATAR: 'Аватары пользователей',
        SITE_LOGO: 'Логотип сайта',
      },
    },
    adminAdvertisements: {
      title: 'Управление рекламой',
      subtitle: 'Создание, планирование и управление рекламными баннерами и видео для сайта и приложения.',
      createButton: 'Создать рекламу',
      refreshButton: 'Обновить',
      retryButton: 'Повторить',
      checkingPermissions: 'Проверка прав администратора...',
      userRoleBlockedTitle: 'Страница доступна только администраторам',
      userRoleBlockedSubtitle: 'Для управления рекламой войдите в аккаунт с ролью ADMIN.',
      switchAccountButton: 'Сменить аккаунт',
      backendForbiddenTitle: 'Доступ ограничен сервером',
      backendForbiddenSubtitle: 'У вашего аккаунта недостаточно прав для управления рекламой.',
      backendForbiddenEndpointLabel: 'Запрошенный endpoint',
      backToStore: 'Вернуться в каталог',
      searchPlaceholder: 'Поиск по названию рекламы...',
      channelFilterLabel: 'Канал',
      statusFilterLabel: 'Статус',
      allChannels: 'Все каналы',
      allStatuses: 'Все статусы',
      clearFilters: 'Сбросить фильтры',
      emptyTitle: 'Рекламы пока нет',
      emptyDescription: 'Нажмите «Создать рекламу», чтобы добавить первый рекламный черновик.',
      emptyFilteredTitle: 'Подходящая реклама не найдена',
      emptyFilteredDescription: 'Попробуйте изменить поисковый запрос или параметры фильтра.',
      totalCountSuffix: 'объявлений',
      channels: {
        WEB: 'Сайт (WEB)',
        APP: 'Приложение (APP)',
      },
      statuses: {
        DRAFT: 'Черновик',
        PUBLISHED: 'Опубликовано',
        PAUSED: 'На паузе',
        ARCHIVED: 'В архиве',
      },
      visibilities: {
        DRAFT: 'Черновик',
        SCHEDULED: 'Запланировано',
        LIVE: 'В эфире',
        ENDED: 'Завершено',
        PAUSED: 'На паузе',
        ARCHIVED: 'В архиве',
      },
      mediaKinds: {
        IMAGE: 'Изображение',
        VIDEO: 'Видео',
        NONE: 'Без медиа',
      },
      columns: {
        title: 'Заголовок',
        media: 'Тип медиа',
        channels: 'Каналы',
        schedule: 'Период показа',
        status: 'Статус',
        updatedAt: 'Обновлено',
        actions: 'Действия',
      },
      scheduleUnlimited: 'Без ограничения',
      scheduleFromPrefix: 'С',
      scheduleToPrefix: 'По',
      editStatusPrefix: 'Статус',
      revisionPrefix: 'Ревизия',
      sortOrderLabel: 'Порядок',
      actions: {
        edit: 'Редактировать',
        view: 'Просмотр',
        history: 'История',
        publish: 'Опубликовать',
        pause: 'Пауза',
        archive: 'Архивировать',
      },
      drawer: {
        createTitle: 'Создание рекламы',
        editTitle: 'Редактирование рекламы',
        viewArchivedTitle: 'Архивная реклама (только просмотр)',
        archivedReadOnlyNotice: 'Архивную рекламу нельзя редактировать или менять её статус.',
        uzSectionTitle: 'Данные на узбекском',
        ruSectionTitle: 'Данные на русском',
        titleLabel: 'Заголовок',
        titlePlaceholderUz: 'Например: Hafta aksiyasi',
        titlePlaceholderRu: 'Например: Акция недели',
        descriptionLabel: 'Описание (необязательно)',
        descriptionPlaceholderUz: 'Текст рекламы на узбекском языке...',
        descriptionPlaceholderRu: 'Краткое или подробное описание акции...',
        channelsLabel: 'Каналы показа',
        channelsHint: 'Выберите хотя бы один канал (сайт или мобильное приложение).',
        targetUrlLabel: 'Целевая ссылка (необязательно)',
        targetUrlPlaceholder: '/products/choyan-qozon или https://example.com',
        targetUrlHint: 'Укажите внутренний путь вида /... или полную ссылку https://.',
        scheduleSectionTitle: 'Расписание показа',
        timezoneNoticePrefix: 'Ваш часовой пояс',
        startsAtLabel: 'Дата начала',
        endsAtLabel: 'Дата окончания',
        clearDateButton: 'Очистить',
        utcPreviewPrefix: 'Время UTC для сервера',
        sortOrderLabel: 'Порядок сортировки (sortOrder)',
        sortOrderHint: 'Неотрицательное целое число (меньше — выше в списке).',
        mediaSectionTitle: 'Медиафайл (Изображение или Видео)',
        mediaHint: 'PNG/JPEG (до 2 МБ и 2048×2048 px) или MP4-видео (до 25 МБ).',
        selectMediaButton: 'Выбрать файл',
        changeMediaButton: 'Заменить файл',
        resetSelectedMediaButton: 'Отменить выбор',
        currentSavedMediaLabel: 'Текущий сохранённый файл',
        newSelectedMediaLabel: 'Новый выбранный файл',
        noMediaNotice: 'Медиа ещё не загружено. Черновик можно сохранить без файла, но для публикации медиа обязательно.',
        mediaLoadError: 'Не удалось загрузить медиафайл.',
        mediaNotFound: 'Медиафайл не найден на сервере.',
        saveButton: 'Сохранить',
        saveDraftButton: 'Сохранить как черновик',
        cancelButton: 'Отмена',
        closeButton: 'Закрыть',
        conflictBannerTitle: 'Конфликт версий (409)',
        loadLatestVersionButton: 'Загрузить актуальную версию',
        applyServerValuesButton: 'Подставить данные с сервера',
        latestVersionLoadedNotice: 'Актуальная версия загружена с сервера, ваши изменения в форме сохранены. Теперь можно повторить сохранение.',
      },
      validation: {
        uzTitleRequired: 'Введите заголовок на узбекском.',
        uzTitleMax: 'Заголовок на узбекском не должен превышать 160 символов.',
        uzDescriptionMax: 'Описание на узбекском не должно превышать 3000 символов.',
        ruTitleRequired: 'Введите заголовок на русском.',
        ruTitleMax: 'Заголовок на русском не должен превышать 160 символов.',
        ruDescriptionMax: 'Описание на русском не должно превышать 3000 символов.',
        channelsRequired: 'Выберите хотя бы один канал (WEB или APP).',
        targetUrlInvalid: 'Укажите корректный путь, начинающийся с /, или полную ссылку https://.',
        sortOrderInvalid: 'Порядок сортировки должен быть целым числом не меньше 0.',
        endsAfterStarts: 'Дата окончания должна быть позже даты начала.',
        mediaInvalidType: 'Допускаются только изображения PNG, JPEG или видео MP4.',
        mediaImageTooLarge: 'Размер изображения не должен превышать 2 МБ.',
        mediaVideoTooLarge: 'Размер видео не должен превышать 25 МБ.',
        mediaInvalidDimensions: 'Размеры изображения не должны превышать 2048×2048 px.',
        mediaUnreadable: 'Не удалось прочитать выбранный медиафайл.',
        publishMediaRequired: 'Для публикации рекламы необходимо загрузить изображение или видео.',
        publishEndsAtPast: 'Нельзя опубликовать рекламу с уже прошедшей датой окончания.',
        reasonMax: 'Комментарий не должен превышать 1000 символов.',
      },
      archiveModal: {
        title: 'Архивация рекламы',
        subtitle: 'Архивированная реклама станет доступна только для просмотра и не сможет редактироваться.',
        reasonLabel: 'Комментарий (необязательно)',
        reasonPlaceholder: 'Укажите причину архивации (до 1000 символов)...',
        confirmButton: 'Подтвердить архивацию',
        cancelButton: 'Отмена',
      },
      history: {
        title: 'История изменений',
        subtitle: 'Журнал ревизий по каждому сохранению и изменению статуса.',
        emptyTitle: 'Записей истории пока нет',
        emptyDescription: 'Для этой рекламы ещё не зафиксировано изменений.',
        actorLabel: 'Исполнитель',
        systemActor: 'Система',
        reasonLabel: 'Комментарий',
        viewVersionButton: 'Открыть версию',
        snapshotModalTitle: 'Содержимое версии',
        channelsLabel: 'Каналы',
        targetUrlLabel: 'Целевая ссылка',
        scheduleLabel: 'Период показа',
        sortOrderLabel: 'Порядок сортировки',
        statusLabel: 'Статус',
        mediaLabel: 'Медиа',
        noMediaInVersion: 'В этой версии медиафайл отсутствует',
        actions: {
          CREATED: 'Создана',
          UPDATED: 'Обновлена',
          PUBLISHED: 'Опубликована',
          PAUSED: 'Поставлена на паузу',
          ARCHIVED: 'Архивирована',
          STATUS_CHANGED: 'Статус изменён',
        },
      },
      notifications: {
        createdSuccess: 'Черновик рекламы создан',
        updatedSuccess: 'Изменения рекламы сохранены',
        publishedSuccess: 'Реклама опубликована',
        pausedSuccess: 'Реклама поставлена на паузу',
        archivedSuccess: 'Реклама архивирована',
        loadDetailError: 'Не удалось загрузить данные рекламы.',
        notFoundError: 'Реклама не найдена.',
      },
    },
  },
};

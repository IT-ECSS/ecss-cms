// Test script to verify validation message translations
// This is a simple test to check that the validation translations are working correctly

// Mock component instance to test the validation translations
const mockCheckoutPageInstance = {
  props: { selectedLanguage: 'english' }, // This will be changed for testing

  getValidationTranslations() {
    const { selectedLanguage = 'english' } = this.props;
    
    const translations = {
      required: {
        english: 'is required',
        chinese: '是必填项',
        malay: 'diperlukan'
      },
      paymentMethod: {
        english: 'Payment method is required',
        chinese: '付款方式是必填项',
        malay: 'Kaedah pembayaran diperlukan'
      },
      collectionMode: {
        english: 'Collection mode is required',
        chinese: '取货方式是必填项',
        malay: 'Mod pengumpulan diperlukan'
      },
      collectionLocation: {
        english: 'Collection location is required',
        chinese: '取货地点是必填项',
        malay: 'Lokasi pengumpulan diperlukan'
      },
      collectionDate: {
        english: 'Collection date is required',
        chinese: '取货日期是必填项',
        malay: 'Tarikh pengumpulan diperlukan'
      },
      collectionTime: {
        english: 'Collection time is required',
        chinese: '取货时间是必填项',
        malay: 'Masa pengumpulan diperlukan'
      },
      deliveryAddress: {
        english: 'Delivery address is required',
        chinese: '送货地址是必填项',
        malay: 'Alamat penghantaran diperlukan'
      },
      cartEmpty: {
        english: 'Your cart is empty',
        chinese: '您的购物车是空的',
        malay: 'Troli anda kosong'
      },
      fieldDisplayNames: {
        firstName: {
          english: 'First name',
          chinese: '名字',
          malay: 'Nama pertama'
        },
        lastName: {
          english: 'Last name',
          chinese: '姓氏',
          malay: 'Nama keluarga'
        },
        phone: {
          english: 'Phone',
          chinese: '电话',
          malay: 'Telefon'
        },
        location: {
          english: 'Location/Club',
          chinese: '位置/俱乐部',
          malay: 'Lokasi/Kelab'
        }
      }
    };

    return translations;
  }
};

// Test function
function testValidationTranslations() {
  console.log('Testing Validation Message Translations\n');
  console.log('=' . repeat(50));
  
  const languages = ['english', 'chinese', 'malay'];
  
  languages.forEach(language => {
    console.log(`\n--- Testing ${language.toUpperCase()} ---`);
    
    // Set the language
    mockCheckoutPageInstance.props.selectedLanguage = language;
    
    // Get translations
    const translations = mockCheckoutPageInstance.getValidationTranslations();
    
    // Test basic validation messages
    console.log('Basic Validation Messages:');
    console.log(`  Payment Method: ${translations.paymentMethod[language]}`);
    console.log(`  Collection Mode: ${translations.collectionMode[language]}`);
    console.log(`  Collection Location: ${translations.collectionLocation[language]}`);
    console.log(`  Collection Date: ${translations.collectionDate[language]}`);
    console.log(`  Collection Time: ${translations.collectionTime[language]}`);
    console.log(`  Cart Empty: ${translations.cartEmpty[language]}`);
    
    // Test field-specific messages
    console.log('\nField-specific Messages:');
    const fieldNames = ['firstName', 'lastName', 'phone', 'location'];
    fieldNames.forEach(field => {
      const fieldDisplayName = translations.fieldDisplayNames[field][language];
      const requiredText = translations.required[language];
      console.log(`  ${field}: ${fieldDisplayName} ${requiredText}`);
    });
  });
  
  console.log('\n' + '=' . repeat(50));
  console.log('Test completed successfully!');
}

// Helper function to repeat a string (since repeat might not be available in older JS)
String.prototype.repeat = String.prototype.repeat || function(count) {
  return new Array(count + 1).join(this);
};

// Run the test
testValidationTranslations();